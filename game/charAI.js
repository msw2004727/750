// ── Character AI: exploration + flocking ──

import { world } from './state.js';
import { bus } from './eventBus.js';
import { canMoveTo, CHAR_LAYER } from './charData.js';
import { findFreeSlot } from './charMove.js';

const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
const VISIT_DECAY = 200;     // ticks before old memory fades
const FLOCK_RANGE = 8;       // Manhattan distance for attraction
const FLOCK_WEIGHT = 0.05;   // attraction per tile closer
const STUCK_LIMIT = 3;       // ticks stuck before memory reset

let _aiTick = 0;

// ── Visit score: higher = more attractive (unvisited = 1.0) ──
function _visitScore(ch, gx, gy){
  const visited = ch.state.visited;
  if(!visited) return 1;
  const key = gx + ',' + gy;
  const lastTick = visited[key];
  if(lastTick === undefined) return 1;
  return Math.min(_aiTick - lastTick, VISIT_DECAY) / VISIT_DECAY;
}

// ── Flock score: same-type characters nearby pull toward them ──
function _flockScore(ch, nx, ny){
  let pull = 0;
  const chars = world.blocks.filter(b => b.type === 'character' && b !== ch);
  for(const other of chars){
    if(other.state.clsLabel !== ch.state.clsLabel) continue;
    const dist = Math.abs(other.gx - nx) + Math.abs(other.gy - ny);
    if(dist < FLOCK_RANGE){
      pull += (FLOCK_RANGE - dist) * FLOCK_WEIGHT;
    }
  }
  return pull;
}

// ── Pick next move for a character ──
function _pickMove(ch){
  const candidates = [];
  for(const [dx, dy] of DIRS){
    const nx = ch.gx + dx, ny = ch.gy + dy;
    if(!canMoveTo(ch, nx, ny)) continue;
    let score = _visitScore(ch, nx, ny);
    score += _flockScore(ch, nx, ny);
    candidates.push({nx, ny, score});
  }
  if(candidates.length === 0) return null;
  // Weighted random selection
  const total = candidates.reduce((s, c) => s + c.score, 0);
  if(total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
  let r = Math.random() * total;
  for(const c of candidates){
    r -= c.score;
    if(r <= 0) return c;
  }
  return candidates[candidates.length - 1];
}

// ── AI tick: evaluate each character ──
function _tickAI(){
  _aiTick++;
  const chars = world.blocks.filter(b => b.type === 'character');
  for(const ch of chars){
    const st = ch.state;
    if(!st._tickCount) st._tickCount = 0;
    st._tickCount = _aiTick;

    // Skip if still moving to a target
    if(st._targetGx !== undefined && (st._targetGx !== ch.gx || st._targetGy !== ch.gy)) continue;

    // Stagger: only decide every 2 ticks, offset by char index
    const idx = world.blocks.indexOf(ch);
    if((_aiTick + idx) % 2 !== 0) continue;

    const move = _pickMove(ch);
    if(!move){
      st._stuckCount = (st._stuckCount || 0) + 1;
      if(st._stuckCount > STUCK_LIMIT){
        st.visited = {}; // clear memory
        st._stuckCount = 0;
      }
      continue;
    }
    st._stuckCount = 0;

    // Set target tile
    st._targetGx = move.nx;
    st._targetGy = move.ny;
    // Target sub-slot in new tile
    const slot = findFreeSlot(move.nx, move.ny, ch.gz, 0.25, 0.25, ch);
    st._targetSubX = slot.sx;
    st._targetSubY = slot.sy;

    // Mark current tile as visited
    if(!st.visited) st.visited = {};
    st.visited[ch.gx + ',' + ch.gy] = _aiTick;

    // Cap visited memory
    const keys = Object.keys(st.visited);
    if(keys.length > 5000){
      // Remove oldest 1000
      const sorted = keys.sort((a,b) => st.visited[a] - st.visited[b]);
      for(let i = 0; i < 1000; i++) delete st.visited[sorted[i]];
    }
  }
}

// Listen to game tick for AI decisions
bus.on('play:tick', () => {
  _tickAI();
});
