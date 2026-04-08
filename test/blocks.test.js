import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { hasBlockAt, computeReachable, selectConnected, findEmptySpot } from '../game/blocks.js';
import { addBlock } from '../game/spatialHash.js';
import { S } from '../game/state.js';

describe('blocks', () => {
  beforeEach(() => resetState());

  describe('hasBlockAt', () => {
    it('returns false for empty position', () => {
      assert.strictEqual(hasBlockAt(0, 0, 0, null, 0), false);
    });

    it('returns true after adding block', () => {
      addBlock({ gx: 3, gy: 4, gz: 0, layer: 0, color: 't000', srcH: 32 });
      assert.strictEqual(hasBlockAt(3, 4, 0, null, 0), true);
    });

    it('excludes specified block', () => {
      const b = { gx: 3, gy: 4, gz: 0, layer: 0, color: 't000', srcH: 32 };
      addBlock(b);
      assert.strictEqual(hasBlockAt(3, 4, 0, b, 0), false);
    });

    it('respects layer parameter', () => {
      addBlock({ gx: 0, gy: 0, gz: 0, layer: 1, color: 't000', srcH: 32 });
      assert.strictEqual(hasBlockAt(0, 0, 0, null, 0), false);
      assert.strictEqual(hasBlockAt(0, 0, 0, null, 1), true);
    });

    it('uses S.currentLayer when layer not specified', () => {
      S.currentLayer = 2;
      addBlock({ gx: 0, gy: 0, gz: 0, layer: 2, color: 't000', srcH: 32 });
      assert.strictEqual(hasBlockAt(0, 0, 0), true);
    });
  });

  describe('computeReachable', () => {
    it('returns large set in open space', () => {
      const r = computeReachable(0, 0, 0, null);
      assert.ok(r.size > 50);
    });

    it('is blocked by surrounding blocks', () => {
      // Surround (0,0) on all 4 sides
      addBlock({ gx: 1, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
      addBlock({ gx: -1, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
      addBlock({ gx: 0, gy: 1, gz: 0, layer: 0, color: 't000', srcH: 32 });
      addBlock({ gx: 0, gy: -1, gz: 0, layer: 0, color: 't000', srcH: 32 });
      const r = computeReachable(0, 0, 0, null);
      assert.strictEqual(r.size, 1);
    });

    it('excludes the dragged block from obstacles', () => {
      const center = { gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 };
      addBlock(center);
      addBlock({ gx: 1, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
      // center itself should not block reachability
      const r = computeReachable(0, 0, 0, center);
      assert.ok(r.has('0,0'));
      assert.ok(!r.has('1,0')); // blocked by other block
    });
  });

  describe('selectConnected', () => {
    it('selects single block', () => {
      const b = { gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 };
      addBlock(b);
      selectConnected(b);
      assert.ok(S.selectedBlocks.has(b));
      assert.strictEqual(S.selectedBlocks.size, 1);
    });

    it('selects connected group', () => {
      const b1 = { gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 };
      const b2 = { gx: 1, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 };
      const b3 = { gx: 2, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 };
      addBlock(b1); addBlock(b2); addBlock(b3);
      selectConnected(b1);
      assert.strictEqual(S.selectedBlocks.size, 3);
    });

    it('does not select diagonally adjacent', () => {
      const b1 = { gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 };
      const b2 = { gx: 1, gy: 1, gz: 0, layer: 0, color: 't000', srcH: 32 };
      addBlock(b1); addBlock(b2);
      selectConnected(b1);
      assert.strictEqual(S.selectedBlocks.size, 1);
    });

    it('does not cross layers', () => {
      const b1 = { gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 };
      const b2 = { gx: 1, gy: 0, gz: 0, layer: 1, color: 't000', srcH: 32 };
      addBlock(b1); addBlock(b2);
      selectConnected(b1);
      assert.strictEqual(S.selectedBlocks.size, 1);
    });
  });

  describe('findEmptySpot', () => {
    it('returns (0,0) when empty', () => {
      const spot = findEmptySpot();
      assert.ok(spot.gx == 0, `gx=${spot.gx}`);
      assert.ok(spot.gy == 0, `gy=${spot.gy}`);
    });

    it('finds adjacent spot when origin occupied', () => {
      addBlock({ gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
      const spot = findEmptySpot();
      const dist = Math.abs(spot.gx) + Math.abs(spot.gy);
      assert.ok(dist >= 1);
      assert.strictEqual(hasBlockAt(spot.gx, spot.gy, 0, null, 0), false);
    });
  });
});
