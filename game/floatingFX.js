// ── Floating damage/heal numbers + projectile visuals ──

import { S, world, ctx, camera } from './state.js';
import { toScreen } from './coords.js';

const FLOAT_DURATION = 900;
const FLOAT_RISE = 40;
const FLOAT_STACK_GAP = 18;
const MAX_FLOATS = 40;

const FX_COLORS = {
  dmgPhys:  '#ff3333',
  dmgMagic: '#cc44ff',
  heal:     '#33ff66',
  mpCost:   '#4488ff',
  mpRecover:'#44ddff',
};

// ── Spawn floating number ──
export function spawnFloat(gx, gy, gz, text, type){
  const p = toScreen(gx, gy, gz);
  // Count recent floats at same position for stacking
  const now = performance.now();
  const nearby = world.floats.filter(f => Math.abs(f.sx - p.x) < 10 && Math.abs(f.sy - p.y) < 10 && now - f.born < 500);
  world.floats.push({
    sx: p.x, sy: p.y,
    text: String(text),
    color: FX_COLORS[type] || '#fff',
    born: now,
    slot: nearby.length,
  });
  if(world.floats.length > MAX_FLOATS) world.floats.shift();
  S._dirty = true;
}

// ── Spawn projectile ──
export function spawnProjectile(srcGx, srcGy, srcGz, tgtGx, tgtGy, tgtGz, type, damage, targetId){
  const s = toScreen(srcGx, srcGy, srcGz);
  const t = toScreen(tgtGx, tgtGy, tgtGz);
  const duration = type === 'arrow' ? 250 : 400;
  world.projectiles.push({
    sx: s.x, sy: s.y, tx: t.x, ty: t.y,
    born: performance.now(),
    duration,
    type, damage, targetId,
  });
  S._dirty = true;
}

// ── Update projectiles (called from gameLoop) ──
export function updateProjectiles(now, onHit){
  const alive = [];
  for(const p of world.projectiles){
    const t = (now - p.born) / p.duration;
    if(t >= 1){
      // Arrived → trigger hit callback
      if(onHit) onHit(p);
    } else {
      p._progress = t;
      alive.push(p);
    }
  }
  world.projectiles = alive;
  if(alive.length > 0) S._dirty = true;
}

// ── Update floats (prune expired) ──
export function updateFloats(now){
  world.floats = world.floats.filter(f => now - f.born < FLOAT_DURATION);
  if(world.floats.length > 0) S._dirty = true;
}

// ── Render floating numbers ──
export function drawFloats(){
  const now = performance.now();
  ctx.save();
  for(const f of world.floats){
    const elapsed = now - f.born;
    const t = elapsed / FLOAT_DURATION;
    const rise = FLOAT_RISE * (1 - (1 - t) * (1 - t)); // ease-out
    const alpha = t > 0.55 ? 1 - (t - 0.55) / 0.45 : 1;
    const x = f.sx;
    const y = f.sy - rise - f.slot * FLOAT_STACK_GAP;
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Black outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(f.text, x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, x, y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Render projectiles ──
export function drawProjectiles(){
  const now = performance.now();
  ctx.save();
  for(const p of world.projectiles){
    const t = p._progress || 0;
    const x = p.sx + (p.tx - p.sx) * t;
    const y = p.sy + (p.ty - p.sy) * t;
    if(p.type === 'arrow'){
      // Line segment pointing toward target
      const angle = Math.atan2(p.ty - p.sy, p.tx - p.sx);
      ctx.strokeStyle = '#ffcc44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(angle) * 6, y - Math.sin(angle) * 6);
      ctx.lineTo(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3);
      ctx.stroke();
    } else {
      // Magic orb with trail
      for(let i = 2; i >= 0; i--){
        const tt = Math.max(0, t - i * 0.05);
        const tx2 = p.sx + (p.tx - p.sx) * tt;
        const ty2 = p.sy + (p.ty - p.sy) * tt;
        ctx.globalAlpha = [0.8, 0.4, 0.15][i];
        ctx.fillStyle = '#cc44ff';
        ctx.beginPath();
        ctx.arc(tx2, ty2, 4 - i, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
