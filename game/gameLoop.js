import { S, game } from './state.js';
import { bus } from './eventBus.js';
import { tickMovement, isAnyMoving } from './charMove.js';
import { updateProjectiles, updateFloats } from './floatingFX.js';
import { onProjectileHit } from './combatAI.js';

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
const ANIM_INTERVAL = 600;

function loop(now) {
  requestAnimationFrame(loop);
  const rawDt = lastTime ? now - lastTime : 0;
  const dt = Math.min(rawDt, 500); // cap dt to prevent burst after tab switch
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
    if (S.animBlockCount > 0) S._dirty = true;
  }

  // Game tick (1 second interval when running)
  if (game.running && now - game.lastTick >= 1000) {
    game.lastTick = now;
    bus.emit('play:tick', now);
  }

  // Character movement sub-tick (200ms steps)
  if (game.running) {
    tickMovement(now);
    updateProjectiles(now, onProjectileHit);
    updateFloats(now);
    if (isAnyMoving()) S._dirty = true;
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
