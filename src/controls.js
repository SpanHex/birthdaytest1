/* =====================================================================
   controls.js — GBA-style controller + desktop key bindings
   ===================================================================== */

export const virtualKeys = {
  up: false, down: false, left: false, right: false,
};

// ── Desktop action triggers ──────────────────────────────────────────
export function triggerActionA() {
  const nextChevron = document.getElementById('dialogue-next');
  const closeBtn    = document.getElementById('close');
  const dialogueUI  = document.getElementById('textbox-container');

  if (dialogueUI && dialogueUI.style.display !== 'none') {
    // If next page chevron is visible, click it; otherwise close
    if (nextChevron && nextChevron.classList.contains('visible')) {
      nextChevron.click();
    } else if (closeBtn) {
      closeBtn.click();
    }
  }
}

export function triggerActionB() {
  const closeBtn   = document.getElementById('close');
  const dialogueUI = document.getElementById('textbox-container');
  if (dialogueUI && dialogueUI.style.display !== 'none' && closeBtn) {
    closeBtn.click();
  }
}

// ── Init controls ────────────────────────────────────────────────────
export function initControls(k) {
  // Touch device detection (exclude fine-pointer desktops)
  const isTouchDevice =
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
    !window.matchMedia('(pointer: fine)').matches;

  if (isTouchDevice) {
    document.body.classList.add('touch-device');
    setupMobileControls();
  }

  // Desktop key listeners
  window.addEventListener('keydown', (e) => {
    // Prevent page scroll
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }

    const dialogueUI = document.getElementById('textbox-container');
    const isDialogueOpen = dialogueUI && dialogueUI.style.display !== 'none';

    if (isDialogueOpen) {
      if (['Enter',' ','z','Z','e','E'].includes(e.key)) {
        e.preventDefault();
        triggerActionA();
      }
      if (['Escape','Backspace','x','X'].includes(e.key)) {
        e.preventDefault();
        triggerActionB();
      }
    }
  }, { passive: false });
}

// ── Mobile GBA controls ───────────────────────────────────────────────
function setupMobileControls() {
  if (document.getElementById('mobile-controls')) return;

  const controlsHTML = `
    <div id="mobile-controls" class="mobile-controls" aria-hidden="true">

      <!-- D-Pad -->
      <div id="dpad-container" class="dpad-container" role="group" aria-label="Directional pad">
        <div class="dpad-grid">
          <div class="dpad-btn dpad-up"    data-dir="up"    aria-label="Up">▲</div>
          <div class="dpad-btn dpad-left"  data-dir="left"  aria-label="Left">◀</div>
          <div class="dpad-btn dpad-center" aria-hidden="true"></div>
          <div class="dpad-btn dpad-right" data-dir="right" aria-label="Right">▶</div>
          <div class="dpad-btn dpad-down"  data-dir="down"  aria-label="Down">▼</div>
        </div>
      </div>

      <!-- START / SELECT pills -->
      <div class="gba-center-btns">
        <div class="center-btn">
          <div id="btn-select" class="center-btn-pill" role="button" aria-label="Select" tabindex="0"></div>
          <span class="center-btn-label">SELECT</span>
        </div>
        <div class="center-btn">
          <div id="btn-start" class="center-btn-pill" role="button" aria-label="Start" tabindex="0"></div>
          <span class="center-btn-label">START</span>
        </div>
      </div>

      <!-- A / B Buttons -->
      <div id="action-container" class="action-container" role="group" aria-label="Action buttons">
        <div class="action-btn-wrap">
          <button id="action-b" class="action-btn btn-b" aria-label="B button — back or cancel">B</button>
          <span class="btn-label">BACK</span>
        </div>
        <div class="action-btn-wrap">
          <button id="action-a" class="action-btn btn-a" aria-label="A button — interact or confirm">A</button>
          <span class="btn-label">ACT</span>
        </div>
      </div>
    </div>
  `;

  const appDiv = document.getElementById('app');
  if (appDiv) appDiv.insertAdjacentHTML('beforeend', controlsHTML);

  const dpad   = document.getElementById('dpad-container');
  const btnA   = document.getElementById('action-a');
  const btnB   = document.getElementById('action-b');
  const btnStart  = document.getElementById('btn-start');
  const btnSelect = document.getElementById('btn-select');

  // ── D-pad touch tracking ──────────────────────────────────────────
  function handleDpadTouch(e) {
    e.preventDefault();
    e.stopPropagation();

    const rect = dpad.getBoundingClientRect();
    let activeTouch = null;

    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (t.clientX >= rect.left && t.clientX <= rect.right &&
          t.clientY >= rect.top  && t.clientY <= rect.bottom) {
        activeTouch = t;
        break;
      }
    }

    if (!activeTouch) { clearDpad(); return; }

    // Hit test the exact element under finger
    const element = document.elementFromPoint(activeTouch.clientX, activeTouch.clientY);
    if (element && element.classList.contains('dpad-btn') && element.dataset.dir) {
      const dir = element.dataset.dir;
      virtualKeys.up    = dir === 'up';
      virtualKeys.down  = dir === 'down';
      virtualKeys.left  = dir === 'left';
      virtualKeys.right = dir === 'right';

      dpad.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dir === dir);
      });
    } else {
      clearDpad();
    }
  }

  function clearDpad(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    virtualKeys.up = virtualKeys.down = virtualKeys.left = virtualKeys.right = false;
    dpad.querySelectorAll('.dpad-btn').forEach(btn => btn.classList.remove('active'));
  }

  dpad.addEventListener('touchstart',  handleDpadTouch, { passive: false });
  dpad.addEventListener('touchmove',   handleDpadTouch, { passive: false });
  dpad.addEventListener('touchend',    clearDpad,       { passive: false });
  dpad.addEventListener('touchcancel', clearDpad,       { passive: false });
  // Prevent double-tap zoom
  dpad.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });

  // ── Action buttons ─────────────────────────────────────────────────
  function makeActionHandler(triggerFn) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      const el = e.currentTarget;
      el.classList.add('active');
      setTimeout(() => el.classList.remove('active'), 150);
      triggerFn();
    };
  }

  const handleA = makeActionHandler(triggerActionA);
  const handleB = makeActionHandler(triggerActionB);

  btnA.addEventListener('touchstart', handleA, { passive: false });
  btnA.addEventListener('mousedown',  handleA);
  btnB.addEventListener('touchstart', handleB, { passive: false });
  btnB.addEventListener('mousedown',  handleB);

  // Prevent gesture zoom on action buttons
  [btnA, btnB].forEach(btn =>
    btn.addEventListener('gesturestart', e => e.preventDefault(), { passive: false })
  );

  // ── START button — close/open dialogue ────────────────────────────
  if (btnStart) {
    const handleStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btnStart.classList.add('active');
      setTimeout(() => btnStart.classList.remove('active'), 150);

      const dialogueUI = document.getElementById('textbox-container');
      if (dialogueUI && dialogueUI.style.display !== 'none') {
        triggerActionB();
      }
    };
    btnStart.addEventListener('touchstart', handleStart, { passive: false });
    btnStart.addEventListener('mousedown',  handleStart);
  }

  // ── SELECT button — toggle keyboard hint (desktop only, no-op on mobile) ──
  if (btnSelect) {
    const handleSelect = (e) => {
      e.preventDefault();
      btnSelect.classList.add('active');
      setTimeout(() => btnSelect.classList.remove('active'), 150);
    };
    btnSelect.addEventListener('touchstart', handleSelect, { passive: false });
    btnSelect.addEventListener('mousedown',  handleSelect);
  }

  // ── Multi-touch: allow D-pad + A simultaneously ───────────────────
  // A & B buttons already listen independently; Kaboom's own touch handling
  // on the canvas is separate, so no conflict occurs.
}
