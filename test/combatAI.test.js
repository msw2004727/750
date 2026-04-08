import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { world } from '../game/state.js';
import { addBlock } from '../game/spatialHash.js';
import { CHAR_LAYER } from '../game/charData.js';
import { onProjectileHit } from '../game/combatAI.js';

function makeChar(gx, gy, gz, faction, cls, overrides){
  const block = {
    gx, gy, gz, layer: CHAR_LAYER,
    type: 'character', color: 'SwordMan', srcH: 32,
    state: {
      clsLabel: cls || '步兵',
      faction: faction,
      curHp: 80, curMp: 0,
      aiState: 'idle', outOfCombatTicks: 0,
      attackCooldown: 0, action: 'idle',
      style: 'outline', facing: 'right',
      speed: 2, path: [],
      actions: { idle: 4, walk: 6, attack: 6, hurt: 3, death: 4 },
      subX: 0.25, subY: 0.25,
      charType: '物理',
      ...overrides
    }
  };
  addBlock(block);
  return block;
}

describe('combatAI', () => {
  beforeEach(() => resetState());

  describe('onProjectileHit', () => {
    it('applies damage (ATK - DEF, min 1)', () => {
      // Ground tile so character placement is valid
      addBlock({ gx:0, gy:0, gz:0, layer:0, type:'tile', color:'t000', srcH:32 });
      const target = makeChar(0, 0, 0, '正義', '步兵');
      const initHp = target.state.curHp;
      onProjectileHit({ targetId: target.id, damage: 15, type: 'arrow' });
      // 步兵 DEF=8, damage=15, effective = 15-8=7
      assert.strictEqual(target.state.curHp, initHp - 7);
    });

    it('minimum damage is 1', () => {
      addBlock({ gx:1, gy:1, gz:0, layer:0, type:'tile', color:'t000', srcH:32 });
      const target = makeChar(1, 1, 0, '正義', '步兵');
      const initHp = target.state.curHp;
      onProjectileHit({ targetId: target.id, damage: 1, type: 'arrow' });
      // 步兵 DEF=8, damage=1, effective = max(1, 1-8) = 1
      assert.strictEqual(target.state.curHp, initHp - 1);
    });

    it('magic halves DEF', () => {
      addBlock({ gx:2, gy:2, gz:0, layer:0, type:'tile', color:'t000', srcH:32 });
      const target = makeChar(2, 2, 0, '正義', '步兵');
      const initHp = target.state.curHp;
      // 步兵 DEF=8, magic halves to 4, damage=15, effective=15-4=11
      onProjectileHit({ targetId: target.id, damage: 15, type: 'magic' });
      assert.strictEqual(target.state.curHp, initHp - 11);
    });

    it('sets aiState to dead when HP reaches 0', () => {
      addBlock({ gx:3, gy:3, gz:0, layer:0, type:'tile', color:'t000', srcH:32 });
      const target = makeChar(3, 3, 0, '正義', '步兵', { curHp: 5 });
      onProjectileHit({ targetId: target.id, damage: 100, type: 'arrow' });
      assert.strictEqual(target.state.aiState, 'dead');
      assert.strictEqual(target.state.curHp, 0);
    });

    it('ignores already dead target', () => {
      addBlock({ gx:4, gy:4, gz:0, layer:0, type:'tile', color:'t000', srcH:32 });
      const target = makeChar(4, 4, 0, '正義', '步兵', { aiState: 'dead', curHp: 0 });
      // Should not throw
      onProjectileHit({ targetId: target.id, damage: 50, type: 'arrow' });
      assert.strictEqual(target.state.curHp, 0);
    });

    it('ignores missing target', () => {
      // Should not throw
      onProjectileHit({ targetId: 99999, damage: 50, type: 'arrow' });
    });
  });
});
