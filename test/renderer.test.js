import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { getVisibleRange, updateRenderSteps } from '../game/renderer.js';
import { camera } from '../game/state.js';

describe('renderer', () => {
  beforeEach(() => {
    resetState();
    camera.x = 0; camera.y = 0; camera.zoom = 1;
    camera.W = 800; camera.H = 600;
  });

  describe('getVisibleRange', () => {
    it('returns object with min/max grid bounds', () => {
      const vr = getVisibleRange();
      assert.ok('minGx' in vr);
      assert.ok('maxGx' in vr);
      assert.ok('minGy' in vr);
      assert.ok('maxGy' in vr);
    });

    it('range includes origin', () => {
      const vr = getVisibleRange();
      assert.ok(vr.minGx <= 0 && vr.maxGx >= 0);
      assert.ok(vr.minGy <= 0 && vr.maxGy >= 0);
    });

    it('zooming out increases range', () => {
      camera.zoom = 1;
      const vr1 = getVisibleRange();
      camera.zoom = 0.5;
      const vr2 = getVisibleRange();
      const range1 = (vr1.maxGx - vr1.minGx) * (vr1.maxGy - vr1.minGy);
      const range2 = (vr2.maxGx - vr2.minGx) * (vr2.maxGy - vr2.minGy);
      assert.ok(range2 > range1);
    });
  });

  describe('updateRenderSteps', () => {
    it('does not throw', () => {
      assert.doesNotThrow(() => updateRenderSteps());
    });
  });
});
