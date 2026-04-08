import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { addBlock } from '../game/spatialHash.js';
import { CHAR_LAYER } from '../game/charData.js';
import { findFreeSlot, stepCharacter } from '../game/charMove.js';

function makeChar(gx, gy, gz, stateOverrides){
  const ch = {
    gx, gy, gz, layer:CHAR_LAYER,
    type:'character', color:'SwordMan', srcH:32,
    state: { subX:0.25, subY:0.25, ...stateOverrides }
  };
  addBlock(ch);
  return ch;
}

describe('charMove', () => {
  beforeEach(() => resetState());

  describe('findFreeSlot', () => {
    it('returns preferred slot when tile is empty', () => {
      const slot = findFreeSlot(0, 0, 0, 0.25, 0.25, null);
      assert.strictEqual(slot.sx, 0.25);
      assert.strictEqual(slot.sy, 0.25);
    });

    it('avoids occupied sub-slot', () => {
      makeChar(0, 0, 0, { subX:0.25, subY:0.25 });
      const slot = findFreeSlot(0, 0, 0, 0.25, 0.25, null);
      assert.ok(slot.sx !== 0.25 || slot.sy !== 0.25, 'should avoid occupied slot');
    });

    it('exclude parameter allows self overlap', () => {
      const ch = makeChar(0, 0, 0, { subX:0.25, subY:0.25 });
      const slot = findFreeSlot(0, 0, 0, 0.25, 0.25, ch);
      assert.strictEqual(slot.sx, 0.25);
      assert.strictEqual(slot.sy, 0.25);
    });
  });

  describe('stepCharacter', () => {
    it('returns false when no target', () => {
      const ch = makeChar(0, 0, 0);
      assert.strictEqual(stepCharacter(ch), false);
    });

    it('moves within same tile toward target sub-position', () => {
      const ch = makeChar(0, 0, 0, {
        subX:0, subY:0,
        _targetGx:0, _targetGy:0,
        _targetSubX:0.5, _targetSubY:0.5
      });
      const moved = stepCharacter(ch);
      assert.strictEqual(moved, true);
      assert.ok(ch.state.subX > 0, 'subX should increase');
      assert.ok(ch.state.subY > 0, 'subY should increase');
    });

    it('arrives and clears target when close enough', () => {
      const ch = makeChar(0, 0, 0, {
        subX:0.25, subY:0.25,
        _targetGx:0, _targetGy:0,
        _targetSubX:0.25, _targetSubY:0.25,
        action:'walk'
      });
      const moved = stepCharacter(ch);
      assert.strictEqual(moved, false);
      assert.strictEqual(ch.state._targetGx, undefined);
      assert.strictEqual(ch.state.action, 'idle');
    });

    it('walks toward edge when target is different tile', () => {
      addBlock({ gx:1, gy:0, gz:0, layer:0, type:'tile', color:'t000', srcH:32 });
      const ch = makeChar(0, 0, 0, {
        subX:0.25, subY:0.25,
        _targetGx:1, _targetGy:0,
        _targetSubX:0.25, _targetSubY:0.25,
        actions: { walk:6, idle:4 }
      });
      stepCharacter(ch);
      assert.strictEqual(ch.state.action, 'walk');
    });
  });
});
