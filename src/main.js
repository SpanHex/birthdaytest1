/* =====================================================================
   main.js — Kaboom.js birthday adventure game
   ===================================================================== */

import { dialogueData, scaleFactor, interactionHints } from './constants';
import { k } from './kaboomCtx';
import { displayDialogue, setCamScale, burstParticles, launchConfetti, fadeTransition } from './utils';
import { initControls, virtualKeys } from './controls';

/* ──────────────────────────────────────────────────────────────────────
   SPRITE LOADING
   ────────────────────────────────────────────────────────────────────── */
k.loadSprite('spritesheet', './spritesheet.png', {
  sliceX: 39,
  sliceY: 31,
  anims: {
    'idle-down': 936,
    'walk-down': { from: 936, to: 939, loop: true, speed: 8 },
    'idle-side': 975,
    'walk-side': { from: 975, to: 978, loop: true, speed: 8 },
    'idle-up':   1014,
    'walk-up':   { from: 1014, to: 1017, loop: true, speed: 8 },
  },
});

k.loadSprite('map', './map.png');

/* ── Birthday cake (procedural pixel-art) ────────────────────────────── */
function createCakeSpriteSheet() {
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 16;
  const ctx    = canvas.getContext('2d');

  const colors = {
    '.': null, P: '#997b66', p: '#b08968',
    C: '#ff65a3', c: '#ff4d8d',
    W: '#ffffff', w: '#e3e3e3',
    R: '#ff2a2a', r: '#c41e3a',
    B: '#00b4d8', b: '#90e0ef',
    F: '#ff9f1c', Y: '#ffe600',
  };

  const frames = [
    [ '................', '.......F........', '.......YF.......', '.......YF.......',
      '.......Bb.......', '.......bB.......', '.......Bb.......', '....WWWWWWW.....',
      '....wCCRCCw.....', '....wcccccw.....', '...WWWWWWWWW....', '...wCCRCCRcw....',
      '...wcccccccw....', '..WWWWWWWWWWW...', '..PPPPPPPPPPP...', '...PPPPPPPPP....' ],
    [ '................', '........F.......', '.......FY.......', '.......FY.......',
      '.......Bb.......', '.......bB.......', '.......Bb.......', '....WWWWWWW.....',
      '....wCCRCCw.....', '....wcccccw.....', '...WWWWWWWWW....', '...wCCRCCRcw....',
      '...wcccccccw....', '..WWWWWWWWWWW...', '..PPPPPPPPPPP...', '...PPPPPPPPP....' ],
  ];

  frames.forEach((frame, fi) => {
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const key = frame[r][c];
        if (colors[key]) {
          ctx.fillStyle = colors[key];
          ctx.fillRect(c + fi * 16, r, 1, 1);
        }
      }
    }
  });

  return canvas.toDataURL();
}

k.loadSprite('birthday-cake', createCakeSpriteSheet(), {
  sliceX: 2, sliceY: 1,
  anims: { flicker: { from: 0, to: 1, loop: true, speed: 4 } },
});

/* ──────────────────────────────────────────────────────────────────────
   BACKGROUND & SCENE
   ────────────────────────────────────────────────────────────────────── */
k.setBackground(k.Color.fromHex('#311047'));

k.scene('main', async () => {
  /* ── Load map data ─────────────────────────────────────────────────── */
  const mapData = await (await fetch('./map.tmj')).json();
  const layers  = mapData.layers;

  const map = k.add([
    k.sprite('map'),
    k.pos(-400),
    k.scale(scaleFactor),
  ]);

  /* ── Player ─────────────────────────────────────────────────────────── */
  const player = k.add([
    k.sprite('spritesheet', { anim: 'idle-down' }),
    k.area({ shape: new k.Rect(k.vec2(0, 3), 10, 10) }),
    k.body(),
    k.anchor('center'),
    k.pos(50, 50),
    k.scale(scaleFactor),
    {
      speed: 250,
      direction: 'down',
      isInDialogue: false,
    },
    'player',
  ]);

  /* ── Active boundary name for interaction indicator ────────────────── */
  let nearBoundary = null;
  const boundaryHints = {}; // boundaryName → DOM element (future use)

  /* ── Process map layers ─────────────────────────────────────────────── */
  for (const layer of layers) {

    if (layer.name === 'boundaries') {
      for (const boundary of layer.objects) {
        // Create static body
        map.add([
          k.area({ shape: new k.Rect(k.vec2(0), boundary.width, boundary.height) }),
          k.body({ isStatic: true }),
          k.pos(boundary.x, boundary.y),
          boundary.name,
        ]);

        // Birthday cake sprite on the PC boundary
        if (boundary.name === 'pc') {
          map.add([
            k.sprite('birthday-cake', { anim: 'flicker' }),
            k.pos(boundary.x + boundary.width / 2, boundary.y + 30),
            k.anchor('bot'),
          ]);
        }

        // Collision → dialogue
        if (boundary.name && dialogueData[boundary.name]) {
          player.onCollide(boundary.name, () => {
            if (player.isInDialogue) return;
            player.isInDialogue = true;

            // Burst particles at player screen position
            const screenPos = k.toScreen(player.worldPos());
            burstParticles(screenPos.x, screenPos.y, 10);

            displayDialogue(
              dialogueData[boundary.name],
              () => { player.isInDialogue = false; },
              boundary.name === 'exit',
            );
          });
        }
      }
      continue;
    }

    if (layer.name === 'spawnpoints') {
      for (const entity of layer.objects) {
        if (entity.name === 'player') {
          player.pos = k.vec2(
            (map.pos.x + entity.x) * scaleFactor,
            (map.pos.y + entity.y) * scaleFactor,
          );
        }
      }
    }
  }

  /* ── Camera & resize ────────────────────────────────────────────────── */
  setCamScale(k);
  k.onResize(() => setCamScale(k));

  /* ── Controls ───────────────────────────────────────────────────────── */
  initControls(k);

  /* ── Game intro: confetti burst ─────────────────────────────────────── */
  setTimeout(() => launchConfetti(40), 500);

  /* ── Main update loop ──────────────────────────────────────────────── */
  k.onUpdate(() => {
    // Smooth camera — offset up slightly so player isn't hidden behind controls
    const camY = player.worldPos().y - 100;
    k.camPos(player.worldPos().x, camY);

    if (player.isInDialogue) return;

    const right = k.isKeyDown('right') || k.isKeyDown('d') || virtualKeys.right;
    const left  = k.isKeyDown('left')  || k.isKeyDown('a') || virtualKeys.left;
    const up    = k.isKeyDown('up')    || k.isKeyDown('w') || virtualKeys.up;
    const down  = k.isKeyDown('down')  || k.isKeyDown('s') || virtualKeys.down;

    const keys = [right, left, up, down];
    const pressed = keys.filter(Boolean).length;

    if (pressed === 0) {
      if (player.curAnim()?.startsWith('walk-')) stopAnims();
      return;
    }
    if (pressed > 1) return;

    if (right) {
      player.flipX = false;
      if (player.curAnim() !== 'walk-side') player.play('walk-side');
      player.direction = 'right';
      player.move(player.speed, 0);
      return;
    }
    if (left) {
      player.flipX = true;
      if (player.curAnim() !== 'walk-side') player.play('walk-side');
      player.direction = 'left';
      player.move(-player.speed, 0);
      return;
    }
    if (up) {
      if (player.curAnim() !== 'walk-up') player.play('walk-up');
      player.direction = 'up';
      player.move(0, -player.speed);
      return;
    }
    if (down) {
      if (player.curAnim() !== 'walk-down') player.play('walk-down');
      player.direction = 'down';
      player.move(0, player.speed);
    }
  });

  /* ── Click-to-move (desktop) ─────────────────────────────────────── */
  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== 'left' || player.isInDialogue) return;

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);
    const lo = 50, hi = 125;

    if (mouseAngle > lo && mouseAngle < hi && player.curAnim() !== 'walk-up') {
      player.play('walk-up'); player.direction = 'up';
    } else if (mouseAngle < -lo && mouseAngle > -hi && player.curAnim() !== 'walk-down') {
      player.play('walk-down'); player.direction = 'down';
    } else if (Math.abs(mouseAngle) > hi) {
      player.flipX = false;
      if (player.curAnim() !== 'walk-side') player.play('walk-side');
      player.direction = 'right';
    } else if (Math.abs(mouseAngle) < lo) {
      player.flipX = true;
      if (player.curAnim() !== 'walk-side') player.play('walk-side');
      player.direction = 'left';
    }
  });

  /* ── Stop animations ─────────────────────────────────────────────── */
  function stopAnims() {
    switch (player.direction) {
      case 'down': player.play('idle-down'); break;
      case 'up':   player.play('idle-up');   break;
      default:     player.play('idle-side'); break;
    }
  }

  k.onMouseRelease(stopAnims);
  k.onKeyRelease(stopAnims);
});

/* ── Start scene with fade-in ────────────────────────────────────────── */
k.go('main');
