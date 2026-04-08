import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import {
  getRelation, getClassStats, canMoveTo, getCharAt,
  CHARS, CHAR_LAYER, FACTION_COLORS, CLASS_STATS, IMG_BASE
} from '../game/charData.js';
import { addBlock } from '../game/spatialHash.js';

describe('charData', () => {
  beforeEach(() => resetState());

  describe('constants', () => {
    it('CHARS has 22 entries', () => {
      assert.strictEqual(CHARS.length, 22);
    });
    it('CHAR_LAYER is 6', () => {
      assert.strictEqual(CHAR_LAYER, 6);
    });
    it('FACTION_COLORS has 4 factions', () => {
      assert.strictEqual(Object.keys(FACTION_COLORS).length, 4);
    });
    it('IMG_BASE is a URL-encoded path', () => {
      assert.ok(IMG_BASE.includes('%E7%B4%A0%E6%9D%90'));
    });
    it('CLASS_STATS has 5 classes', () => {
      assert.strictEqual(Object.keys(CLASS_STATS).length, 5);
    });
    it('each CHAR has required fields', () => {
      for(const c of CHARS){
        assert.ok(c.name, 'name');
        assert.ok(c.label, 'label');
        assert.ok(c.cls, 'cls');
        assert.ok(c.clsLabel, 'clsLabel');
        assert.ok(c.actions, 'actions');
        assert.ok(c.actions.idle, 'idle action');
      }
    });
  });

  describe('getRelation', () => {
    it('正義 vs 反派 = hostile', () => {
      assert.strictEqual(getRelation('正義', '反派'), 'hostile');
    });
    it('善良 vs 邪惡 = flee', () => {
      assert.strictEqual(getRelation('善良', '邪惡'), 'flee');
    });
    it('正義 vs 善良 = neutral', () => {
      assert.strictEqual(getRelation('正義', '善良'), 'neutral');
    });
    it('unknown faction = neutral', () => {
      assert.strictEqual(getRelation('unknown', '正義'), 'neutral');
    });
    it('邪惡 attacks everyone', () => {
      assert.strictEqual(getRelation('邪惡', '正義'), 'hostile');
      assert.strictEqual(getRelation('邪惡', '反派'), 'hostile');
      assert.strictEqual(getRelation('邪惡', '善良'), 'hostile');
    });
  });

  describe('getClassStats', () => {
    it('returns stats for valid class', () => {
      const s = getClassStats('步兵');
      assert.strictEqual(s.hp, 80);
      assert.strictEqual(s.atk, 10);
      assert.strictEqual(s.def, 8);
    });
    it('unknown class falls back to 村民', () => {
      const s = getClassStats('unknown');
      assert.strictEqual(s.hp, 30);
      assert.strictEqual(s.atk, 3);
    });
  });

  describe('getCharAt', () => {
    it('returns null for empty tile', () => {
      assert.strictEqual(getCharAt(0, 0, 0), null);
    });
    it('returns character block at position', () => {
      const b = { gx:1, gy:2, gz:0, layer:CHAR_LAYER, type:'character', color:'SwordMan', srcH:32 };
      addBlock(b);
      const ch = getCharAt(1, 2, 0);
      assert.ok(ch);
      assert.strictEqual(ch.type, 'character');
      assert.strictEqual(ch.color, 'SwordMan');
    });
    it('ignores non-character blocks', () => {
      addBlock({ gx:1, gy:1, gz:0, layer:CHAR_LAYER, type:'tile', color:'t000', srcH:32 });
      assert.strictEqual(getCharAt(1, 1, 0), null);
    });
  });

  describe('canMoveTo', () => {
    it('returns true with ground tile', () => {
      addBlock({ gx:3, gy:3, gz:0, layer:0, type:'tile', color:'t000', srcH:32 });
      const ch = { gz:0 };
      assert.strictEqual(canMoveTo(ch, 3, 3), true);
    });
    it('returns false without ground', () => {
      const ch = { gz:0 };
      assert.strictEqual(canMoveTo(ch, 5, 5), false);
    });
    it('returns false for tall wall tile', () => {
      addBlock({ gx:4, gy:4, gz:0, layer:0, type:'tile', color:'t000', srcH:48 });
      const ch = { gz:0 };
      assert.strictEqual(canMoveTo(ch, 4, 4), false);
    });
    it('returns false when head space blocked', () => {
      addBlock({ gx:2, gy:2, gz:0, layer:0, type:'tile', color:'t000', srcH:32 });
      addBlock({ gx:2, gy:2, gz:1, layer:0, type:'tile', color:'t000', srcH:32 });
      const ch = { gz:0 };
      assert.strictEqual(canMoveTo(ch, 2, 2), false);
    });
    it('returns false when occupied by character', () => {
      addBlock({ gx:6, gy:6, gz:0, layer:0, type:'tile', color:'t000', srcH:32 });
      addBlock({ gx:6, gy:6, gz:0, layer:CHAR_LAYER, type:'character', color:'SwordMan', srcH:32 });
      const ch = { gz:0 };
      assert.strictEqual(canMoveTo(ch, 6, 6), false);
    });
  });
});
