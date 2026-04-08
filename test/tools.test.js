import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { getRectLineCells, computeFillPreview } from '../game/tools.js';
import { addBlock } from '../game/spatialHash.js';
import { S } from '../game/state.js';

describe('tools', () => {
  beforeEach(() => resetState());

  describe('getRectLineCells', () => {
    it('returns rect cells when rectMode is on', () => {
      S.rectMode = true;
      S.lineMode = false;
      const cells = getRectLineCells(0, 0, 2, 2);
      assert.strictEqual(cells.length, 9);
    });

    it('returns line cells when lineMode is on', () => {
      S.rectMode = false;
      S.lineMode = true;
      const cells = getRectLineCells(0, 0, 5, 0);
      assert.strictEqual(cells.length, 6); // 0..5 horizontal
    });
  });

  describe('computeFillPreview', () => {
    it('fills open area', () => {
      S.currentHeight = 0;
      S.currentLayer = 0;
      const result = computeFillPreview(0, 0);
      assert.ok(result.length > 0);
    });

    it('respects existing blocks as walls', () => {
      S.currentHeight = 0;
      S.currentLayer = 0;
      // Surround (0,0)
      addBlock({ gx: 1, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
      addBlock({ gx: -1, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
      addBlock({ gx: 0, gy: 1, gz: 0, layer: 0, color: 't000', srcH: 32 });
      addBlock({ gx: 0, gy: -1, gz: 0, layer: 0, color: 't000', srcH: 32 });
      const result = computeFillPreview(0, 0);
      assert.strictEqual(result.length, 1);
    });
  });
});
