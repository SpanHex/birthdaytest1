/* =====================================================================
   script.js — Surprise/Gallery page logic
   No CDN dependencies. Pure vanilla JS.
   3D Carousel + scroll-driven narrative + heart shower + YES/NO
   ===================================================================== */

'use strict';

/* ──────────────────────────────────────────────────────────────────────
   PHOTO DATA
   Replace picsum IDs with your own images if desired.
   ────────────────────────────────────────────────────────────────────── */
const PHOTOS = [
  { src: 'https://picsum.photos/id/100/800/600',  alt: 'Beach memories' },
  { src: 'https://picsum.photos/id/111/800/600',  alt: 'A beautiful drive' },
  { src: 'https://picsum.photos/id/140/800/600',  alt: 'A quiet moment' },
  { src: 'https://picsum.photos/id/160/800/600',  alt: 'Moments like these' },
  { src: 'https://picsum.photos/id/180/800/600',  alt: 'Simple afternoons' },
  { src: 'https://picsum.photos/id/198/800/600',  alt: 'Where we roam' },
  { src: 'https://picsum.photos/id/210/800/600',  alt: 'Finding joy' },
  { src: 'https://picsum.photos/id/220/800/600',  alt: 'On the way' },
  { src: 'https://picsum.photos/id/240/800/600',  alt: 'Our world' },
  { src: 'https://picsum.photos/id/260/800/600',  alt: 'Winter wonder' },
  { src: 'https://picsum.photos/id/280/800/600',  alt: 'By the sea' },
  { src: 'https://picsum.photos/id/360/800/600',  alt: 'Blooming for you' },
  { src: 'https://picsum.photos/id/320/800/600',  alt: 'City lights' },
  { src: 'https://picsum.photos/id/340/800/600',  alt: 'Old trees, new memories' },
];

/* ──────────────────────────────────────────────────────────────────────
   CAROUSEL ENGINE (inline, no import needed for static file)
   ────────────────────────────────────────────────────────────────────── */
class CarouselEngine {
  constructor(stage, ring, items, options = {}) {
    this.stage   = stage;
    this.ring    = ring;
    this.items   = items;
    this.count   = items.length;

    this.lerpSpeed    = options.lerpSpeed    ?? 0.085;
    this.sensitivity  = options.sensitivity  ?? 0.3;
    this.autoRotate   = options.autoRotate   ?? false;
    this.autoSpeed    = options.autoSpeed    ?? 0.12;  // deg/frame

    // Angle state
    this.targetAngle  = 0;
    this.currentAngle = 0;

    // Drag state
    this.isDragging     = false;
    this.dragStartX     = 0;
    this.dragStartAngle = 0;
    this.lastX          = 0;
    this.lastTime       = 0;
    this.velocity       = 0;

    this.anglePerItem = 360 / this.count;
    this._rafId       = null;
    this._running     = false;

    this._calcRadius();
    this._bindEvents();
  }

  /* ── Radius based on viewport ──────────────────────────────────── */
  _calcRadius() {
    const w = window.innerWidth;
    if      (w >= 2560) this.radius = 900;
    else if (w >= 1440) this.radius = 680;
    else if (w >= 1024) this.radius = 520;
    else if (w >= 768)  this.radius = 380;
    else if (w >= 480)  this.radius = 260;
    else                this.radius = 210;
  }

  /* ── Navigation ─────────────────────────────────────────────────── */
  prev() { this.targetAngle += this.anglePerItem; this.velocity = 0; }
  next() { this.targetAngle -= this.anglePerItem; this.velocity = 0; }

  goTo(index) {
    const norm  = (((-this.currentAngle) % 360) + 360) % 360;
    const cur   = Math.round(norm / this.anglePerItem) % this.count;
    let delta   = index - cur;
    if (delta >  this.count / 2) delta -= this.count;
    if (delta < -this.count / 2) delta += this.count;
    this.targetAngle -= delta * this.anglePerItem;
    this.velocity = 0;
  }

  currentIndex() {
    const norm = (((-this.currentAngle) % 360) + 360) % 360;
    return Math.round(norm / this.anglePerItem) % this.count;
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  _render() {
    this.items.forEach((item, i) => {
      const angle = (i * this.anglePerItem) + this.currentAngle;
      const rad   = (angle * Math.PI) / 180;

      const x = Math.sin(rad) * this.radius;
      const z = Math.cos(rad) * this.radius;

      // Depth normalised 0 (back) → 1 (front)
      const zN = (z + this.radius) / (2 * this.radius);

      const scale   = 0.52 + zN * 0.48;
      const opacity = 0.2  + zN * 0.8;
      const blur    = (1 - zN) * 4;

      item.style.transform   = `translate3d(${x}px, 0, ${z}px) scale(${scale.toFixed(4)})`;
      item.style.opacity     = opacity.toFixed(4);
      item.style.filter      = blur > 0.8 ? `blur(${blur.toFixed(1)}px)` : 'none';
      item.style.zIndex      = Math.round(zN * 100);
      item.style.pointerEvents = zN > 0.88 ? 'auto' : 'none';

      item.classList.toggle('carousel-card--active', zN > 0.97);
    });

    // Update dot indicators
    const ci = this.currentIndex();
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === ci);
    });
  }

  /* ── Tick ────────────────────────────────────────────────────────── */
  _tick() {
    if (!this._running) return;

    if (!this.isDragging) {
      // Auto-rotate: advance target continuously
      if (this.autoRotate) {
        this.targetAngle -= this.autoSpeed;
      }

      // Apply inertia from drag release
      if (Math.abs(this.velocity) > 0.05) {
        this.targetAngle += this.velocity;
        this.velocity    *= 0.91;
      }
    }

    // Lerp current angle toward target
    let delta = this.targetAngle - this.currentAngle;
    // Unwrap for shortest path
    while (delta >  180) delta -= 360;
    while (delta < -180) delta += 360;
    this.currentAngle += delta * this.lerpSpeed;

    this._render();
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._tick();
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  /* ── Snap to nearest ─────────────────────────────────────────────── */
  _snapNearest() {
    const norm = (((-this.targetAngle) % 360) + 360) % 360;
    const idx  = Math.round(norm / this.anglePerItem) % this.count;
    this.targetAngle = -(idx * this.anglePerItem);
    this.velocity    = 0;
  }

  /* ── Input events ─────────────────────────────────────────────────── */
  _bindEvents() {
    const el = this.stage;

    // Mouse drag — pause auto-rotate while dragging, resume on release
    el.addEventListener('mousedown',  e => this._dragStart(e.clientX), { passive: true });
    window.addEventListener('mousemove', e => this._dragMove(e.clientX));
    window.addEventListener('mouseup',   ()  => this._dragEnd());

    // Touch swipe
    el.addEventListener('touchstart', e => this._dragStart(e.touches[0].clientX), { passive: true });
    el.addEventListener('touchmove',  e => {
      // Only prevent default if actively dragging on the stage
      if (this.isDragging) e.preventDefault();
      this._dragMove(e.touches[0].clientX);
    }, { passive: false });
    el.addEventListener('touchend',    () => this._dragEnd(), { passive: true });
    el.addEventListener('touchcancel', () => this._dragEnd(), { passive: true });

    // NOTE: No wheel listener — scroll wheel is reserved for page narrative scrolling.

    // Resize
    window.addEventListener('resize', () => {
      this._calcRadius();
    });
  }

  _dragStart(x) {
    this.isDragging     = true;
    this.dragStartX     = x;
    this.dragStartAngle = this.targetAngle;
    this.lastX          = x;
    this.lastTime       = performance.now();
    this.velocity       = 0;
    this.stage.classList.add('is-dragging');
  }

  _dragMove(x) {
    if (!this.isDragging) return;
    const now     = performance.now();
    const dt      = Math.max(now - this.lastTime, 1);
    const dx      = x - this.lastX;
    this.velocity = (dx / dt) * 2.2;

    const total   = x - this.dragStartX;
    this.targetAngle = this.dragStartAngle + total * this.sensitivity;

    this.lastX    = x;
    this.lastTime = now;
  }

  _dragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.stage.classList.remove('is-dragging');
    if (Math.abs(this.velocity) < 0.5) this._snapNearest();
  }
}

/* ──────────────────────────────────────────────────────────────────────
   SCROLL-DRIVEN NARRATIVE
   ────────────────────────────────────────────────────────────────────── */
class NarrativeScroll {
  /**
   * @param {object} config
   * @param {number} config.totalScrollHeight   Full scrollable px height
   * @param {Array}  config.slides              [{el, start, end, carousel?}]
   * @param {HTMLElement} config.carouselSection
   */
  constructor(config) {
    this.totalHeight    = config.totalScrollHeight;
    this.slides         = config.slides;
    this.carouselSection = config.carouselSection;

    this._rafId  = null;
    this._lastSY = -1;

    this._tick();
  }

  _tick() {
    const sy = window.scrollY;
    if (sy !== this._lastSY) {
      this._lastSY = sy;
      this._update(sy);
    }
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  _update(sy) {
    const pct = Math.min(sy / this.totalHeight, 1); // 0 → 1

    this.slides.forEach(slide => {
      const { el, start, end } = slide;

      if (pct >= start && pct <= end) {
        const local = (pct - start) / (end - start); // 0→1 within this slide

        // Fade in (first 25%), hold (middle 50%), fade out (last 25%)
        let opacity, scale;
        if (local < 0.25) {
          const t = local / 0.25;
          opacity = t;
          scale   = 0.88 + t * 0.12;
        } else if (local > 0.75) {
          const t = (local - 0.75) / 0.25;
          opacity = 1 - t;
          scale   = 1 + t * 0.06;
        } else {
          opacity = 1;
          scale   = 1;
        }

        el.style.opacity   = opacity;
        el.style.transform = `scale(${scale.toFixed(4)})`;
        el.setAttribute('aria-hidden', opacity < 0.05 ? 'true' : 'false');

        if (slide.interactive) {
          el.style.pointerEvents = opacity > 0.3 ? 'auto' : 'none';
        }
      } else {
        el.style.opacity   = '0';
        el.style.transform = 'scale(0.88)';
        el.setAttribute('aria-hidden', 'true');
        if (slide.interactive) el.style.pointerEvents = 'none';
      }
    });
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }
}

/* ──────────────────────────────────────────────────────────────────────
   HEART SHOWER
   ────────────────────────────────────────────────────────────────────── */
function triggerHeartShower(count = 45) {
  const emojis = ['❤️','💖','💝','💕','💗','✨','🌸','🎊','💘','🫶'];
  for (let i = 0; i < count; i++) {
    const el    = document.createElement('div');
    el.className = 'heart-particle';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const dx  = (Math.random() - 0.5) * window.innerWidth * 0.8;
    const dy  = -(window.innerHeight + 80 + Math.random() * 120);
    const rot = (Math.random() - 0.5) * 720;
    const sc  = 0.2 + Math.random() * 0.6;
    const dur = 3 + Math.random() * 2;

    el.style.left = `${10 + Math.random() * 80}vw`;
    el.style.bottom = '-50px';
    el.style.setProperty('--dx',  `${dx}px`);
    el.style.setProperty('--dy',  `${dy}px`);
    el.style.setProperty('--rot', `${rot}deg`);
    el.style.setProperty('--sc',  sc);
    el.style.setProperty('--dur', `${dur}s`);
    el.style.animationDelay = `${Math.random() * 0.8}s`;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur + 1) * 1000);
  }
}

/* ──────────────────────────────────────────────────────────────────────
   LIGHTBOX
   ────────────────────────────────────────────────────────────────────── */
class Lightbox {
  constructor() {
    this.detail    = document.getElementById('detail');
    this.detailImg = document.getElementById('detailImg');
    this.detailTxt = document.getElementById('detailTxt');
    this.cursorClose = document.getElementById('cursorClose');
    this.cursorCircle = document.getElementById('cursorCircle');
    this.isOpen    = false;

    this.detail.addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  open(src, alt) {
    this.isOpen = true;
    this.detailImg.style.background = `url('${src}') center/cover no-repeat`;
    this.detailTxt.textContent      = alt;
    this.detail.style.pointerEvents = 'auto';

    this.detail.style.transition = 'top 0.55s cubic-bezier(0.16, 1, 0.3, 1)';
    this.detail.style.top        = '0';

    this.detailImg.style.transition = 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
    this.detailImg.style.transform  = 'translateY(0)';

    if (this.cursorClose)  this.cursorClose.style.opacity  = '1';
    if (this.cursorCircle) this.cursorCircle.style.opacity = '0';

    this.detail.focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    this.detail.style.top = '100%';
    this.detail.style.pointerEvents = 'none';

    if (this.cursorClose)  this.cursorClose.style.opacity  = '0';
    if (this.cursorCircle) this.cursorCircle.style.opacity = '1';
  }
}

/* ──────────────────────────────────────────────────────────────────────
   CUSTOM CURSOR (desktop only)
   ────────────────────────────────────────────────────────────────────── */
function initCursor() {
  const isFine = window.matchMedia('(pointer: fine)').matches;
  const cursor  = document.getElementById('cursor');
  if (!cursor) return;

  if (!isFine) {
    document.getElementById('cursor-svg').style.display = 'none';
    return;
  }

  const circle = document.getElementById('cursorCircle');
  let cx = 0, cy = 0;

  window.addEventListener('mousemove', e => {
    cx = e.clientX; cy = e.clientY;
    cursor.setAttribute('transform', `translate(${cx},${cy})`);
  });

  // Scale cursor on hoverable items
  document.addEventListener('mouseover', e => {
    const t = e.target;
    if (t.closest('.carousel-card') || t.closest('button') || t.closest('a')) {
      circle.setAttribute('r', '22');
      circle.setAttribute('stroke-width', '2');
    }
  });
  document.addEventListener('mouseout', e => {
    const t = e.relatedTarget;
    if (!t || (!t.closest('.carousel-card') && !t.closest('button') && !t.closest('a'))) {
      circle.setAttribute('r', '12');
      circle.setAttribute('stroke-width', '3');
    }
  });
}

/* ──────────────────────────────────────────────────────────────────────
   ORIENTATION MODAL
   ────────────────────────────────────────────────────────────────────── */
function initOrientation() {
  const modal    = document.getElementById('orientation-modal');
  const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0)
                   && !window.matchMedia('(pointer: fine)').matches;

  if (!isMobile || !modal) return;

  function check() {
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    modal.style.display = portrait ? 'flex' : 'none';
  }

  check();
  if (screen.orientation) screen.orientation.addEventListener('change', check);
  window.addEventListener('orientationchange', check);
  window.addEventListener('resize', check);
}

/* ──────────────────────────────────────────────────────────────────────
   MAIN INIT
   ────────────────────────────────────────────────────────────────────── */
window.addEventListener('load', () => {

  initOrientation();
  initCursor();

  const lightbox = new Lightbox();

  /* ── Build carousel cards ──────────────────────────────────────── */
  const ring  = document.getElementById('carousel-ring');
  const stage = document.getElementById('carousel-stage');
  const dotsContainer = document.getElementById('carousel-dots');
  const cards = [];

  PHOTOS.forEach((photo, i) => {
    const card = document.createElement('div');
    card.className    = 'carousel-card';
    card.setAttribute('role', 'img');
    card.setAttribute('aria-label', photo.alt);

    const img = document.createElement('img');
    img.src    = photo.src;
    img.alt    = photo.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.draggable = false;

    card.appendChild(img);
    ring.appendChild(card);
    cards.push(card);

    // Lightbox on click
    card.addEventListener('click', () => {
      if (!engine.isDragging) lightbox.open(photo.src, photo.alt);
    });

    // Dot
    const dot = document.createElement('div');
    dot.className = 'carousel-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Photo ${i + 1}`);
    dot.setAttribute('tabindex', '0');
    dot.addEventListener('click', () => engine.goTo(i));
    dot.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); engine.goTo(i); }
    });
    dotsContainer.appendChild(dot);
  });

  /* ── Init carousel engine ──────────────────────────────────────── */
  const engine = new CarouselEngine(stage, ring, cards, {
    lerpSpeed:   0.06,    // Smooth following
    sensitivity: 0.35,
    autoRotate:  true,    // Spins continuously in the background
    autoSpeed:   0.10,    // Degrees per frame (~6°/s at 60fps)
  });

  /* ── Nav buttons ──────────────────────────────────────────────── */
  document.getElementById('carousel-prev')?.addEventListener('click', () => engine.prev());
  document.getElementById('carousel-next')?.addEventListener('click', () => engine.next());

  /* ── Scroll height: one viewport per slide ────────────────────── */
  const SLIDE_HEIGHT = window.innerHeight;
  const NUM_SLIDES   = 7;  // txt1–txt7
  const totalHeight  = SLIDE_HEIGHT * NUM_SLIDES;

  document.getElementById('scrollDist').style.height = `${totalHeight}px`;

  /* ── Carousel always visible in background ────────────────────── */
  const carouselSection = document.getElementById('carousel-section');
  carouselSection.classList.add('visible');

  /* ── Narrative scroll setup ───────────────────────────────────── */
  // 7 slides share the full scroll range evenly
  const slides = [
    { el: document.getElementById('txt1'), start: 0,      end: 0.1    },
    { el: document.getElementById('txt2'), start: 0.1,    end: 0.26   },
    { el: document.getElementById('txt3'), start: 0.26,   end: 0.42   },
    { el: document.getElementById('txt4'), start: 0.42,   end: 0.58   },
    { el: document.getElementById('txt5'), start: 0.58,   end: 0.74,  interactive: true },
    { el: document.getElementById('txt6'), start: 0.74,   end: 0.87   },
    { el: document.getElementById('txt7'), start: 0.87,   end: 1.00   },
  ];

  const narrative = new NarrativeScroll({
    totalScrollHeight: totalHeight,
    slides,
    carouselSection,
  });

  // Force first update immediately
  window.scrollTo(0, 0);

  /* ── YES / NO buttons ─────────────────────────────────────────── */
  const btnNo  = document.getElementById('btn-no');
  const btnYes = document.getElementById('btn-yes');

  if (btnNo) {
    const escape = (e) => {
      const isTouch = e.type === 'touchstart';
      if (isTouch) e.preventDefault();
      const maxX = window.innerWidth  - 140;
      const maxY = window.innerHeight - 80;
      const x = Math.random() * maxX - maxX / 2;
      const y = Math.random() * maxY - maxY / 2;
      btnNo.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)';
      btnNo.style.transform  = `translate(${x}px, ${y}px)`;
    };
    btnNo.addEventListener('mouseover', escape);
    btnNo.addEventListener('touchstart', escape, { passive: false });
  }

  if (btnYes) {
    btnYes.addEventListener('click', () => {
      triggerHeartShower(60);
      // Scroll to final slide
      const finalScrollY = totalHeight * 0.88;
      smoothScrollTo(finalScrollY, 2000);
    });
  }

  /* ── Heart shower on final slide enter ─────────────────────────── */
  let heartFired = false;
  const origUpdate = narrative._update.bind(narrative);
  narrative._update = function(sy) {
    origUpdate(sy);
    const pct = sy / totalHeight;
    if (pct >= 0.87 && !heartFired) {
      heartFired = true;
      triggerHeartShower(40);
    }
    if (pct < 0.85) heartFired = false;
  };

  /* ── Start carousel engine ────────────────────────────────────── */
  engine.start();
});

/* ──────────────────────────────────────────────────────────────────────
   SMOOTH SCROLL (no GSAP needed)
   ────────────────────────────────────────────────────────────────────── */
function smoothScrollTo(targetY, duration) {
  const startY   = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  function easeInOutQuart(t) {
    return t < 0.5
      ? 8 * t * t * t * t
      : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutQuart(progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
