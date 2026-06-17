/* =====================================================================
   utils.js — Dialogue, particles, and scene transitions
   ===================================================================== */

// ── Typewriter state ────────────────────────────────────────────────
let typewriterTimer = null;
let isTyping        = false;
let currentPages    = [];
let currentPageIdx  = 0;

// ── DOM refs (cached) ───────────────────────────────────────────────
const getEl = (id) => document.getElementById(id);

// ── Particle burst ───────────────────────────────────────────────────
const EMOJIS = ['🎉','✨','💖','🎊','⭐','🌸','🎈','🎂'];

export function burstParticles(x, y, count = 12) {
  const container = getEl('particle-container');
  if (!container) return;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

    const angle  = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist   = 60 + Math.random() * 80;
    const dx     = Math.cos(angle) * dist;
    const dy     = Math.sin(angle) * dist - 40;
    const rot    = (Math.random() - 0.5) * 360 + 'deg';

    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);
    el.style.setProperty('--rot', rot);
    el.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;

    container.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
}

// ── Confetti rain ────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#ffd700','#ff65a3','#38d468','#00b4d8','#ff9f1c',
  '#c084fc','#fb923c','#f472b6','#34d399','#60a5fa',
];

export function launchConfetti(count = 30) {
  const container = getEl('particle-container');
  if (!container) return;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';

    const isCircle  = Math.random() > 0.5;
    const color     = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const delay     = Math.random() * 1.5;
    const dur       = 2.5 + Math.random() * 1.5;
    const spin      = (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360) + 'deg';

    el.style.left          = `${Math.random() * 100}vw`;
    el.style.top           = `-${8 + Math.random() * 10}px`;
    el.style.setProperty('--col',  color);
    el.style.setProperty('--dur',  `${dur}s`);
    el.style.setProperty('--spin', spin);
    el.style.setProperty('--br',   isCircle ? '50%' : '2px');
    el.style.animationDelay = `${delay}s`;
    el.style.width          = `${6 + Math.random() * 6}px`;
    el.style.height         = `${6 + Math.random() * 6}px`;

    container.appendChild(el);
    setTimeout(() => el.remove(), (dur + delay + 0.2) * 1000);
  }
}

// ── Scene fade transition ─────────────────────────────────────────────
export function fadeTransition(callback, duration = 300) {
  const overlay = getEl('scene-fade');
  if (!overlay) { callback?.(); return; }

  overlay.classList.add('fade-in');
  setTimeout(() => {
    callback?.();
    overlay.classList.remove('fade-in');
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.classList.remove('fade-out'), duration);
  }, duration);
}

// ── Dialogue system ───────────────────────────────────────────────────
/**
 * @param {string|string[]} textOrPages  - Single string or array of pages
 * @param {Function}        onDisplayEnd - Called when dialogue is fully closed
 * @param {boolean}         isExit       - True to show the "Go outside" heart button
 */
export function displayDialogue(textOrPages, onDisplayEnd, isExit = false) {
  // Normalise to array
  currentPages   = Array.isArray(textOrPages) ? textOrPages : [textOrPages];
  currentPageIdx = 0;

  const dialogueUI  = getEl('textbox-container');
  const dialogue    = getEl('dialogue');
  const cursor      = getEl('dialogue-cursor');
  const heartBtn    = getEl('heart-btn');
  const closeBtn    = getEl('close');
  const nextChevron = getEl('dialogue-next');
  const pageInd     = getEl('page-indicator');

  if (!dialogueUI || !dialogue || !closeBtn) return;

  // Configure exit mode
  if (heartBtn) {
    if (isExit) {
      heartBtn.style.display = 'inline-flex';
      heartBtn.textContent   = '💖 Let\'s Go!';
      closeBtn.textContent   = 'Maybe later ▶';
    } else {
      heartBtn.style.display = 'none';
      closeBtn.textContent   = 'Close ▶';
    }
  }

  // Show container (triggers slide-up CSS animation)
  dialogueUI.style.display = 'block';
  // Reset animation
  dialogueUI.style.animation = 'none';
  requestAnimationFrame(() => {
    dialogueUI.style.animation = '';
  });

  function showPage(idx) {
    currentPageIdx = idx;
    const text = currentPages[idx];
    const isLast = idx === currentPages.length - 1;

    // Update page indicator
    if (pageInd) {
      pageInd.textContent = currentPages.length > 1
        ? `${idx + 1} / ${currentPages.length}`
        : '';
    }

    // Hide/show next chevron
    if (nextChevron) {
      nextChevron.classList.toggle('visible', !isLast);
    }

    // Typewriter effect
    clearTypewriter();
    dialogue.textContent = '';
    if (cursor) cursor.classList.remove('visible');

    let i = 0;
    isTyping = true;
    const speed = 18; // ms per character

    typewriterTimer = setInterval(() => {
      if (i < text.length) {
        dialogue.textContent += text[i++];
      } else {
        clearTypewriter();
        if (cursor) cursor.classList.add('visible');
      }
    }, speed);
  }

  // Skip to end of current page if typing
  function skipOrAdvance() {
    if (isTyping) {
      // Skip: show full text immediately
      clearTypewriter();
      dialogue.textContent = currentPages[currentPageIdx];
      if (cursor) cursor.classList.add('visible');
      if (nextChevron) {
        nextChevron.classList.toggle(
          'visible',
          currentPageIdx < currentPages.length - 1
        );
      }
    } else if (currentPageIdx < currentPages.length - 1) {
      // Advance to next page
      showPage(currentPageIdx + 1);
    } else {
      // Last page — close
      closeDialogue();
    }
  }

  function clearTypewriter() {
    if (typewriterTimer) {
      clearInterval(typewriterTimer);
      typewriterTimer = null;
    }
    isTyping = false;
  }

  function closeDialogue() {
    clearTypewriter();
    dialogueUI.style.display = 'none';
    dialogue.textContent = '';
    if (cursor) cursor.classList.remove('visible');
    if (nextChevron) nextChevron.classList.remove('visible');
    if (pageInd) pageInd.textContent = '';

    if (heartBtn) {
      heartBtn.style.display = 'none';
      heartBtn.removeEventListener('click', onHeartClick);
    }

    closeBtn.removeEventListener('click', onCloseBtnClick);
    if (nextChevron) nextChevron.removeEventListener('click', onNextClick);
    window.removeEventListener('keydown', handleKeydown);

    onDisplayEnd?.();
  }

  // ── Event handlers ────────────────────────────────────────────────
  function onCloseBtnClick() {
    if (isTyping) {
      skipOrAdvance();
    } else {
      closeDialogue();
    }
  }

  function onNextClick() {
    skipOrAdvance();
  }

  function onHeartClick() {
    window.location.href = '/surprise/index.html';
  }

  function handleKeydown(e) {
    const dialogueVisible = dialogueUI.style.display !== 'none';
    if (!dialogueVisible) return;

    if (
      e.key === 'Enter' || e.key === ' ' ||
      e.key === 'z'     || e.key === 'Z' ||
      e.key === 'e'     || e.key === 'E'
    ) {
      e.preventDefault();
      skipOrAdvance();
    }
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      closeDialogue();
    }
  }

  closeBtn.addEventListener('click', onCloseBtnClick);
  if (nextChevron) nextChevron.addEventListener('click', onNextClick);
  if (isExit && heartBtn) heartBtn.addEventListener('click', onHeartClick);
  window.addEventListener('keydown', handleKeydown);

  // Start first page
  showPage(0);
}

// ── Camera scale helper ──────────────────────────────────────────────
export function setCamScale(k) {
  // Uniform scale — keep it simple and let Kaboom handle canvas sizing
  k.camScale(k.vec2(1));
}
