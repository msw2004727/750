// ── Character sub-grid movement + smooth interpolation ──

import { S, world, draw } from './state.js';
import { bus } from './eventBus.js';
import { shKey, shGet, shRemove, shAdd } from './spatialHash.js';
import { CHAR_LAYER, canMoveTo } from './characterLib.js';

const SUB_STEP = 0.25;  // 4x4 sub-grid
const MOVE_INTERVAL = 200; // ms per sub-step
let _moveAccum = 0;
let _lastTime = 0;

// ── Find free sub-slot in a tile (spiral from preferred position) ──
export function findFreeSlot(gx, gy, gz, preferSx, preferSy, exclude){
  const chars = _charsAtTile(gx, gy, gz);
  const occupied = new Set();
  for(const c of chars){
    if(c === exclude) continue;
    occupied.add(_subKey(c.state.subX || 0, c.state.subY || 0));
  }
  // Spiral outward from preferred
  const slots = [];
  for(let sx = 0; sx < 1; sx += SUB_STEP){
    for(let sy = 0; sy < 1; sy += SUB_STEP){
      const dist = Math.abs(sx - preferSx) + Math.abs(sy - preferSy);
      slots.push({sx, sy, dist});
    }
  }
  slots.sort((a,b) => a.dist - b.dist);
  for(const s of slots){
    if(!occupied.has(_subKey(s.sx, s.sy))) return {sx: s.sx, sy: s.sy};
  }
  return {sx: preferSx, sy: preferSy}; // fallback
}

function _subKey(sx, sy){ return Math.round(sx*100) + ',' + Math.round(sy*100); }

function _charsAtTile(gx, gy, gz){
  const set = shGet(shKey(gx, gy, gz, CHAR_LAYER));
  if(!set) return [];
  return [...set].filter(b => b.type === 'character');
}

// ── Move character one sub-step toward target ──
export function stepCharacter(ch){
  const st = ch.state;
  if(!st._targetGx && st._targetGx !== 0) return false; // no target

  const targetGx = st._targetGx;
  const targetGy = st._targetGy;
  const curSx = st.subX || 0;
  const curSy = st.subY || 0;

  // Same tile — move within sub-grid
  if(ch.gx === targetGx && ch.gy === targetGy){
    const tSx = st._targetSubX || 0;
    const tSy = st._targetSubY || 0;
    if(Math.abs(curSx - tSx) < 0.01 && Math.abs(curSy - tSy) < 0.01){
      // Arrived
      st.subX = tSx; st.subY = tSy;
      st._targetGx = undefined;
      st.action = 'idle';
      return false;
    }
    st.subX = _approach(curSx, tSx, SUB_STEP);
    st.subY = _approach(curSy, tSy, SUB_STEP);
    return true;
  }

  // Different tile — walk to edge, then cross
  const dx = targetGx - ch.gx;
  const dy = targetGy - ch.gy;

  // Walk to edge of current tile (sub 0.75 in direction)
  const edgeSx = dx > 0 ? 0.75 : dx < 0 ? 0 : curSx;
  const edgeSy = dy > 0 ? 0.75 : dy < 0 ? 0 : curSy;

  if(Math.abs(curSx - edgeSx) > 0.01 || Math.abs(curSy - edgeSy) > 0.01){
    st.subX = _approach(curSx, edgeSx, SUB_STEP);
    st.subY = _approach(curSy, edgeSy, SUB_STEP);
    // Update facing
    if(dx > 0) st.facing = 'SE';
    else if(dx < 0) st.facing = 'NW';
    else if(dy > 0) st.facing = 'SW';
    else if(dy < 0) st.facing = 'NE';
    st.action = 'walk';
    return true;
  }

  // Cross tile boundary
  shRemove(ch);
  ch.gx = targetGx;
  ch.gy = targetGy;
  shAdd(ch);
  // Enter from opposite edge
  st.subX = dx > 0 ? 0 : dx < 0 ? 0.75 : 0.25;
  st.subY = dy > 0 ? 0 : dy < 0 ? 0.75 : 0.25;
  // Find free slot near center
  const slot = findFreeSlot(ch.gx, ch.gy, ch.gz, 0.25, 0.25, ch);
  st._targetSubX = slot.sx;
  st._targetSubY = slot.sy;
  st._targetGx = ch.gx; // now same tile, will settle into sub-slot
  st._targetGy = ch.gy;
  st.action = 'walk';

  // Mark visited
  if(!st.visited) st.visited = {};
  st.visited[ch.gx + ',' + ch.gy] = st._tickCount || 0;

  return true;
}

function _approach(cur, target, step){
  if(Math.abs(target - cur) <= step) return target;
  return cur + (target > cur ? step : -step);
}

// ── Movement tick (called from gameLoop via sub-tick) ──
let _moving = false;
export function tickMovement(now){
  if(!_lastTime) _lastTime = now;
  const dt = now - _lastTime;
  _lastTime = now;
  _moveAccum += dt;
  if(_moveAccum < MOVE_INTERVAL) return;
  _moveAccum -= MOVE_INTERVAL;

  _moving = false;
  const chars = world.blocks.filter(b => b.type === 'character');
  for(const ch of chars){
    if(stepCharacter(ch)) _moving = true;
  }
  if(_moving) S._dirty = true;
}

export function isAnyMoving(){ return _moving; }
