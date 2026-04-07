import { S, world } from './state.js';
import { TILES } from './tileData.js';

// ── Real draw registration (renderer registers its draw function here) ──
let _realDraw = () => {};
export function setRealDraw(fn) { _realDraw = fn; }

// ── Immediate draw (for export image — must render before toDataURL) ──
export function drawNow() {
  _realDraw();
  S._dirty = false;
}

// ── Main loop ──
let lastTime = 0;
let animAccum = 0;
const ANIM_INTERVAL = 200;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = lastTime ? now - lastTime : 0;
  lastTime = now;

  // Shake animation
  if (S.shakeBlock) {
    if (now - S.shakeStart > 400) S.shakeBlock = null;
    S._dirty = true;
  }

  // Spritesheet animation tick
  animAccum += dt;
  if (animAccum >= ANIM_INTERVAL) {
    animAccum -= ANIM_INTERVAL;
    S.animTick++;
    const hasAnim = world.blocks.some(b => {
      const td = TILES[b.color];
      return td && td.frames > 1;
    });
    if (hasAnim) S._dirty = true;
  }

  // Render once per frame if needed
  if (S._dirty) {
    _realDraw();
    S._dirty = false;
  }
}

export function startLoop() {
  requestAnimationFrame(loop);
}
