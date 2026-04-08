// ── Combat AI: attack, flee, rest, damage, death ──

import { S, world, draw } from './state.js';
import { bus } from './eventBus.js';
import { removeBlock } from './spatialHash.js';
import { getRelation, getClassStats, CHAR_LAYER } from './characterLib.js';
import { spawnFloat, spawnProjectile } from './floatingFX.js';
import { canMoveTo } from './characterLib.js';
import { findFreeSlot } from './charMove.js';

const FLEE_SPEED_MULT = 1.5;
const REST_THRESHOLD = 5; // ticks out of combat before rest
const LOW_HP_PCT = 0.2;
const MP_FLEE_THRESHOLD = 15;
const MP_REENGAGE = 30;

// ── Find nearest hostile in range ──
function _findTarget(ch){
  const stats = getClassStats(ch.state.clsLabel);
  const range = stats.range;
  let best = null, bestDist = Infinity;
  for(const b of world.blocks){
    if(b.type !== 'character' || b === ch) continue;
    if(b.state.aiState === 'dead') continue;
    const rel = getRelation(ch.state.faction, b.state.faction);
    if(rel !== 'hostile' && rel !== 'flee') continue;
    const dist = Math.max(Math.abs(b.gx - ch.gx), Math.abs(b.gy - ch.gy)); // Chebyshev
    if(dist <= range && dist < bestDist){
      bestDist = dist;
      best = { target: b, dist, relation: rel };
    }
  }
  return best;
}

// ── Find nearest threat (for flee detection, larger range) ──
function _findThreat(ch){
  const detectionRange = 6;
  let best = null, bestDist = Infinity;
  for(const b of world.blocks){
    if(b.type !== 'character' || b === ch) continue;
    if(b.state.aiState === 'dead') continue;
    const rel = getRelation(ch.state.faction, b.state.faction);
    if(rel !== 'hostile' && rel !== 'flee') continue;
    const dist = Math.max(Math.abs(b.gx - ch.gx), Math.abs(b.gy - ch.gy));
    if(dist <= detectionRange && dist < bestDist){
      bestDist = dist;
      best = b;
    }
  }
  return best;
}

// ── Should this character flee? ──
function _shouldFlee(ch){
  const st = ch.state;
  const stats = getClassStats(st.clsLabel);
  if(st.faction === '善良') return true;
  if(st.curHp < stats.hp * LOW_HP_PCT) return true;
  if(st.charType === '魔法' && (st.curMp || 0) < MP_FLEE_THRESHOLD) return true;
  return false;
}

// ── Apply damage to target ──
function _applyDamage(attacker, target, damage, isMagic){
  const st = target.state;
  const actualDmg = Math.max(1, damage);
  st.curHp = Math.max(0, st.curHp - actualDmg);
  st.action = 'hurt';
  st.outOfCombatTicks = 0;
  spawnFloat(target.gx, target.gy, target.gz,
    '-' + actualDmg, isMagic ? 'dmgMagic' : 'dmgPhys');
  if(st.curHp <= 0){
    st.aiState = 'dead';
    st.action = st.actions && st.actions.death ? 'death' : 'hurt';
    // Remove after delay
    setTimeout(() => {
      if(world.blocks.includes(target)) removeBlock(target);
      S._dirty = true;
    }, 600);
  }
}

// ── Projectile hit callback ──
export function onProjectileHit(proj){
  const target = world.blocks.find(b => b.id === proj.targetId);
  if(!target || target.state.aiState === 'dead') return;
  const stats = getClassStats(target.state.clsLabel);
  const def = stats.def;
  const isMagic = proj.type === 'magic';
  const effectiveDef = isMagic ? Math.floor(def * 0.5) : def;
  _applyDamage(null, target, proj.damage - effectiveDef, isMagic);
}

// ── Combat tick (called from play:tick) ──
function _tickCombat(){
  const chars = world.blocks.filter(b => b.type === 'character' && b.state.aiState !== 'dead');

  for(const ch of chars){
    const st = ch.state;
    const stats = getClassStats(st.clsLabel);

    // Decrement attack cooldown
    if(st.attackCooldown > 0) st.attackCooldown--;

    const threat = _findThreat(ch);

    // ── No threat: rest or explore ──
    if(!threat){
      st.outOfCombatTicks = (st.outOfCombatTicks || 0) + 1;
      if(st.outOfCombatTicks >= REST_THRESHOLD){
        st.aiState = 'rest';
        // HP regen
        if(st.curHp < stats.hp){
          const heal = Math.ceil(stats.hp * 0.05);
          st.curHp = Math.min(stats.hp, st.curHp + heal);
          spawnFloat(ch.gx, ch.gy, ch.gz, '+' + heal, 'heal');
        }
        // MP regen
        if(stats.maxMp > 0 && st.curMp < stats.maxMp){
          const mpHeal = 8;
          st.curMp = Math.min(stats.maxMp, (st.curMp || 0) + mpHeal);
          spawnFloat(ch.gx, ch.gy, ch.gz, '+' + mpHeal, 'mpRecover');
        }
      }
      if(st.aiState !== 'rest') st.aiState = 'idle';
      continue;
    }

    // Has a threat → reset out-of-combat counter
    st.outOfCombatTicks = 0;

    // ── Flee? ──
    if(_shouldFlee(ch)){
      st.aiState = 'flee';
      st.action = 'walk';
      // Move away from threat
      const dx = ch.gx - threat.gx;
      const dy = ch.gy - threat.gy;
      const fleeX = ch.gx + Math.sign(dx || 1);
      const fleeY = ch.gy + Math.sign(dy || 1);
      // Try flee direction, then perpendicular
      const tries = [[fleeX, ch.gy], [ch.gx, fleeY], [fleeX, fleeY]];
      for(const [nx, ny] of tries){
        if(canMoveTo(ch, nx, ny)){
          st._targetGx = nx; st._targetGy = ny;
          const slot = findFreeSlot(nx, ny, ch.gz, 0.25, 0.25, ch);
          st._targetSubX = slot.sx; st._targetSubY = slot.sy;
          break;
        }
      }
      // MP regen while fleeing (slow)
      if(stats.maxMp > 0 && st.curMp < stats.maxMp){
        st.curMp = Math.min(stats.maxMp, (st.curMp || 0) + 2);
      }
      // Check re-engage for magic users
      if(st.charType === '魔法' && st.curMp >= MP_REENGAGE && st.curHp >= stats.hp * LOW_HP_PCT){
        if(st.faction !== '善良') st.aiState = 'idle'; // re-engage next tick
      }
      continue;
    }

    // ── In range: attack ──
    const found = _findTarget(ch);
    if(found && found.relation === 'hostile'){
      const target = found.target;
      st.aiState = 'attack';

      // Face target
      st.facing = (target.gx > ch.gx || target.gy < ch.gy) ? 'right' : 'left';

      if(st.attackCooldown <= 0){
        // Set cooldown (atkSpeed in seconds, ticks are 1s each via play:tick)
        st.attackCooldown = Math.ceil(stats.atkSpeed);

        const isMagic = st.charType === '魔法';
        const damage = stats.atk;

        // MP check for magic
        if(isMagic && stats.mpCost > 0){
          if((st.curMp || 0) < stats.mpCost) continue; // can't afford
          st.curMp -= stats.mpCost;
          spawnFloat(ch.gx, ch.gy, ch.gz, '-' + stats.mpCost, 'mpCost');
        }

        // Choose attack animation
        if(isMagic && st.actions){
          const casts = ['cast_1','cast_2','cast_3','cast_4'].filter(a => st.actions[a]);
          st.action = casts.length > 0 ? casts[Math.floor(Math.random() * casts.length)] : 'attack';
        } else {
          st.action = 'attack';
        }

        // Melee or ranged?
        if(stats.range <= 1){
          // Melee: apply damage directly
          const def = getClassStats(target.state.clsLabel).def;
          _applyDamage(ch, target, damage - def, isMagic);
        } else {
          // Ranged: spawn projectile
          spawnProjectile(
            ch.gx, ch.gy, ch.gz,
            target.gx, target.gy, target.gz,
            isMagic ? 'magic' : 'arrow',
            damage, target.id
          );
        }

        // In-combat MP regen (slow)
        if(stats.maxMp > 0 && st.curMp < stats.maxMp){
          st.curMp = Math.min(stats.maxMp, (st.curMp || 0) + 2);
        }
      } else {
        st.action = 'idle'; // waiting for cooldown
      }
      continue;
    }

    // ── Threat exists but out of attack range: approach ──
    if(threat){
      st.aiState = 'approach';
      st.action = 'walk';
      const dx = Math.sign(threat.gx - ch.gx);
      const dy = Math.sign(threat.gy - ch.gy);
      const tries = [[ch.gx + dx, ch.gy], [ch.gx, ch.gy + dy], [ch.gx + dx, ch.gy + dy]];
      for(const [nx, ny] of tries){
        if(canMoveTo(ch, nx, ny)){
          st._targetGx = nx; st._targetGy = ny;
          const slot = findFreeSlot(nx, ny, ch.gz, 0.25, 0.25, ch);
          st._targetSubX = slot.sx; st._targetSubY = slot.sy;
          break;
        }
      }
    }
  }

  S._dirty = true;
}

bus.on('play:tick', _tickCombat);
