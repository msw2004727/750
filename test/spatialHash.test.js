import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { shKey, shGet, shAdd, shRemove, shRebuild, addBlock, removeBlock, removeBlocksWhere, setBlocks } from '../game/spatialHash.js';
import { world, S } from '../game/state.js';

describe('spatialHash', () => {
  beforeEach(() => resetState());

  describe('shKey', () => {
    it('produces comma-separated string', () => {
      assert.strictEqual(shKey(1, 2, 3, 0), '1,2,3,0');
    });
    it('handles negative values', () => {
      assert.strictEqual(shKey(-1, -2, -3, 1), '-1,-2,-3,1');
    });
  });

  describe('addBlock / shGet', () => {
    it('adds block to spatial hash', () => {
      const b = { gx: 1, gy: 2, gz: 0, layer: 0, color: 't000', srcH: 32 };
      addBlock(b);
      const set = shGet(shKey(1, 2, 0, 0));
      assert.ok(set);
      assert.ok(set.has(b));
    });

    it('adds block to world.blocks', () => {
      addBlock({ gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
      assert.strictEqual(world.blocks.length, 1);
    });

    it('sets default type and state', () => {
      const b = { gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 };
      addBlock(b);
      assert.strictEqual(b.type, 'tile');
      assert.deepStrictEqual(b.state, {});
    });

    it('tall block (srcH>32) registers in gz+1 slot', () => {
      const b = { gx: 0, gy: 0, gz: 0, layer: 0, color: 'j000', srcH: 48 };
      addBlock(b);
      const set0 = shGet(shKey(0, 0, 0, 0));
      const set1 = shGet(shKey(0, 0, 1, 0));
      assert.ok(set0 && set0.has(b));
      assert.ok(set1 && set1.has(b));
    });
  });

  describe('removeBlock', () => {
    it('removes from world.blocks and hash', () => {
      const b = { gx: 5, gy: 5, gz: 0, layer: 0, color: 't000', srcH: 32 };
      addBlock(b);
      removeBlock(b);
      assert.strictEqual(world.blocks.length, 0);
      assert.strictEqual(shGet(shKey(5, 5, 0, 0)), undefined);
    });

    it('removes tall block from both hash slots', () => {
      const b = { gx: 0, gy: 0, gz: 0, layer: 0, color: 'j000', srcH: 48 };
      addBlock(b);
      removeBlock(b);
      assert.strictEqual(shGet(shKey(0, 0, 0, 0)), undefined);
      assert.strictEqual(shGet(shKey(0, 0, 1, 0)), undefined);
    });
  });

  describe('removeBlocksWhere', () => {
    it('removes matching blocks', () => {
      addBlock({ gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
      addBlock({ gx: 1, gy: 0, gz: 0, layer: 0, color: 't001', srcH: 32 });
      addBlock({ gx: 2, gy: 0, gz: 1, layer: 0, color: 't002', srcH: 32 });
      removeBlocksWhere(b => b.gz === 0);
      assert.strictEqual(world.blocks.length, 1);
      assert.strictEqual(world.blocks[0].color, 't002');
    });
  });

  describe('setBlocks', () => {
    it('replaces all blocks and rebuilds hash', () => {
      addBlock({ gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
      const newBlocks = [
        { gx: 10, gy: 10, gz: 0, layer: 0, color: 't050', srcH: 32 },
      ];
      setBlocks(newBlocks);
      assert.strictEqual(world.blocks.length, 1);
      assert.ok(shGet(shKey(10, 10, 0, 0)));
      assert.strictEqual(shGet(shKey(0, 0, 0, 0)), undefined);
    });

    it('sets type and state on new blocks', () => {
      setBlocks([{ gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 }]);
      assert.strictEqual(world.blocks[0].type, 'tile');
    });
  });

  describe('shRebuild', () => {
    it('reconstructs hash from world.blocks', () => {
      const b = { gx: 3, gy: 4, gz: 1, layer: 0, color: 't000', srcH: 32, type: 'tile', state: {} };
      world.blocks = [b];
      shRebuild();
      const set = shGet(shKey(3, 4, 1, 0));
      assert.ok(set && set.has(b));
    });
  });
});
