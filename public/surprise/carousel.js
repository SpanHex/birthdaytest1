/* =====================================================================
   carousel.js — Self-contained 3D infinite carousel engine
   No dependencies. Pure vanilla JS + CSS transforms.
   60 FPS via requestAnimationFrame + linear interpolation (lerp).
   ===================================================================== */

export class CarouselEngine {
  /**
   * @param {HTMLElement}   container  The carousel wrapper element
   * @param {HTMLElement[]} items      Array of card elements
   * @param {object}        options
   */
  constructor(container, items, options = {}) {
    this.container   = container;
    this.items       = items;
    this.count       = items.length;

    // Options
    this.radius      = options.radius      ?? 480;
    this.lerpSpeed   = options.lerpSpeed   ?? 0.08;   // 0–1, lower = smoother
    this.autoRotate  = options.autoRotate  ?? false;
    this.autoSpeed   = options.autoSpeed   ?? 0.08;   // deg/frame

    // State
    this.targetAngle  = 0;
    this.currentAngle = 0;
    this.isDragging   = false;
    this.dragStartX   = 0;
    this.dragStartAngle = 0;
    this.velocity     = 0;      // for inertia
    this.lastDragX    = 0;
    this.lastDragTime = 0;

    // Each item spans this many degrees
    this.anglePerItem = 360 / this.count;

    // Animation
    this._rafId  = null;
    this._active = false;

    this._bindEvents();
    this.start();
  }

  /* ── Angle helpers ──────────────────────────────────────────────── */
  _normaliseAngle(a) {
    // Keep in [0, 360)
    return ((a % 360) + 360) % 360;
  }

  _shortestDelta(from, to) {
    let delta = to - from;
    // Wrap to [-180, 180]
    while (delta >  180) delta -= 360;
    while (delta < -180) delta += 360;
    return delta;
  }

  /* ── Navigation ─────────────────────────────────────────────────── */
  prev() {
    this.targetAngle += this.anglePerItem;
    this.velocity = 0;
  }

  next() {
    this.targetAngle -= this.anglePerItem;
    this.velocity = 0;
  }

  goTo(index) {
    // Rotate so that item[index] faces front (angle 0)
    const currentIdx   = this._getCurrentIndex();
    const delta        = this._shortestDelta(currentIdx, index);
    this.targetAngle  -= delta * this.anglePerItem;
    this.velocity      = 0;
  }

  _getCurrentIndex() {
    const norm  = this._normaliseAngle(-this.currentAngle);
    return Math.round(norm / this.anglePerItem) % this.count;
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  _render() {
    const total = this.count;

    this.items.forEach((item, i) => {
      // Angle of this card relative to current rotation
      const itemAngle = (i * this.anglePerItem) + this.currentAngle;
      const rad       = (itemAngle * Math.PI) / 180;

      // Position on circle
      const x = Math.sin(rad) * this.radius;
      const z = Math.cos(rad) * this.radius;

      // How "front-facing" is this card? (1 = front, 0 = back)
      const zNorm = (z + this.radius) / (2 * this.radius); // 0–1

      // Scale + opacity based on depth
      const scale   = 0.55 + zNorm * 0.45;   // 0.55 → 1.0
      const opacity = 0.25 + zNorm * 0.75;   // 0.25 → 1.0
      const blur    = (1 - zNorm) * 3;        // 3px → 0px

      // Apply transform — all on GPU
      item.style.transform  = `translateX(${x}px) translateZ(${z}px) scale(${scale})`;
      item.style.opacity    = opacity;
      item.style.filter     = blur > 0.5 ? `blur(${blur.toFixed(1)}px)` : 'none';
      item.style.zIndex     = Math.round(zNorm * 100);
      item.style.pointerEvents = zNorm > 0.85 ? 'auto' : 'none';

      // Highlight the frontmost card
      const isFront = zNorm > 0.97;
      item.classList.toggle('carousel-card--active', isFront);
    });
  }

  /* ── Animation loop ─────────────────────────────────────────────── */
  _tick() {
    if (!this._active) return;

    // Auto rotate
    if (this.autoRotate && !this.isDragging) {
      this.targetAngle -= this.autoSpeed;
    }

    // Apply inertia when not dragging
    if (!this.isDragging && Math.abs(this.velocity) > 0.05) {
      this.targetAngle += this.velocity;
      this.velocity    *= 0.92; // friction
    }

    // Lerp current → target
    const delta        = this._shortestDelta(this.currentAngle, this.targetAngle);
    this.currentAngle += delta * this.lerpSpeed;

    this._render();
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  start() {
    if (this._active) return;
    this._active = true;
    this._tick();
  }

  stop() {
    this._active = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  /* ── Resize ──────────────────────────────────────────────────────── */
  updateRadius(r) {
    this.radius = r;
  }

  /* ── Input binding ───────────────────────────────────────────────── */
  _bindEvents() {
    const el = this.container;

    // ── Mouse drag ──────────────────────────────────────────────────
    el.addEventListener('mousedown', (e) => this._onDragStart(e.clientX), { passive: true });
    window.addEventListener('mousemove', (e) => this._onDragMove(e.clientX));
    window.addEventListener('mouseup',   ()  => this._onDragEnd());

    // ── Touch swipe ─────────────────────────────────────────────────
    el.addEventListener('touchstart', (e) => {
      this._onDragStart(e.touches[0].clientX);
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this._onDragMove(e.touches[0].clientX);
    }, { passive: false });

    el.addEventListener('touchend',   () => this._onDragEnd(),   { passive: true });
    el.addEventListener('touchcancel',() => this._onDragEnd(),   { passive: true });

    // ── Mouse wheel ─────────────────────────────────────────────────
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      // Normalise delta across devices
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 30;      // Firefox line mode
      if (e.deltaMode === 2) delta *= 300;     // Page mode
      this.targetAngle -= delta * 0.15;
      this.velocity = 0;
    }, { passive: false });

    // ── Keyboard ────────────────────────────────────────────────────
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') {
        e.preventDefault(); this.prev();
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault(); this.next();
      }
    });
  }

  _onDragStart(clientX) {
    this.isDragging     = true;
    this.dragStartX     = clientX;
    this.dragStartAngle = this.targetAngle;
    this.lastDragX      = clientX;
    this.lastDragTime   = performance.now();
    this.velocity       = 0;
    this.container.classList.add('is-dragging');
  }

  _onDragMove(clientX) {
    if (!this.isDragging) return;

    const now    = performance.now();
    const dt     = Math.max(now - this.lastDragTime, 1);
    const dx     = clientX - this.lastDragX;

    // Velocity for inertia (deg/ms * factor)
    this.velocity = (dx / dt) * 2.5;

    // Map pixel delta to degrees (sensitivity)
    const sensitivity  = 0.3;
    const totalDelta   = clientX - this.dragStartX;
    this.targetAngle   = this.dragStartAngle + totalDelta * sensitivity;

    this.lastDragX    = clientX;
    this.lastDragTime = now;
  }

  _onDragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.container.classList.remove('is-dragging');

    // Snap to nearest card if velocity is small
    if (Math.abs(this.velocity) < 0.5) {
      this._snapToNearest();
    }
  }

  _snapToNearest() {
    const norm  = this._normaliseAngle(-this.targetAngle);
    const idx   = Math.round(norm / this.anglePerItem) % this.count;
    this.targetAngle = -(idx * this.anglePerItem);
    this.velocity    = 0;
  }
}
