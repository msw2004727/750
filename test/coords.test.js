import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { toScreen, toGrid, snap } from '../game/coords.js';
import { camera } from '../game/state.js';

describe('coords', () => {
  beforeEach(() => resetState());

  describe('snap', () => {
    it('rounds to nearest integer', () => {
      assert.strictEqual(snap(2.3), 2);
      assert.strictEqual(snap(2.7), 3);
      assert.ok(snap(-0.4) === 0 || Object.is(snap(-0.4), -0)); // Math.round(-0.4) is -0
      assert.strictEqual(snap(-0.6), -1);
    });
  });

  describe('toScreen / toGrid round-trip', () => {
    it('round-trips at origin with default camera', () => {
      camera.x = 0; camera.y = 0; camera.zoom = 1;
      camera.W = 800; camera.H = 600;
      const s = toScreen(3, 5, 0);
      const g = toGrid(s.x, s.y);
      assert.ok(Math.abs(g.gx - 3) < 0.01, `gx=${g.gx} expected 3`);
      assert.ok(Math.abs(g.gy - 5) < 0.01, `gy=${g.gy} expected 5`);
    });

    it('round-trips at different zoom', () => {
      camera.x = 0; camera.y = 0; camera.zoom = 2;
      camera.W = 800; camera.H = 600;
      const s = toScreen(-2, 4, 0);
      const g = toGrid(s.x, s.y);
      assert.ok(Math.abs(g.gx - (-2)) < 0.01);
      assert.ok(Math.abs(g.gy - 4) < 0.01);
    });

    it('round-trips with camera offset', () => {
      camera.x = 100; camera.y = -50; camera.zoom = 1;
      camera.W = 800; camera.H = 600;
      const s = toScreen(0, 0, 0);
      const g = toGrid(s.x, s.y);
      assert.ok(Math.abs(g.gx) < 0.01);
      assert.ok(Math.abs(g.gy) < 0.01);
    });
  });

  describe('toScreen', () => {
    it('origin block is at screen center', () => {
      camera.x = 0; camera.y = 0; camera.zoom = 1;
      camera.W = 800; camera.H = 600;
      const s = toScreen(0, 0, 0);
      assert.strictEqual(s.x, 400);
      assert.strictEqual(s.y, 300);
    });

    it('higher gz moves block up on screen', () => {
      camera.x = 0; camera.y = 0; camera.zoom = 1;
      camera.W = 800; camera.H = 600;
      const low = toScreen(0, 0, 0);
      const high = toScreen(0, 0, 1);
      assert.ok(high.y < low.y, 'higher gz should have smaller y');
    });

    it('symmetry: (gx,gy) and (gy,gx) are mirrored on x-axis', () => {
      camera.x = 0; camera.y = 0; camera.zoom = 1;
      camera.W = 800; camera.H = 600;
      const a = toScreen(2, 5, 0);
      const b = toScreen(5, 2, 0);
      // x should be negated relative to center
      assert.ok(Math.abs((a.x - 400) + (b.x - 400)) < 0.01);
      // y should be the same
      assert.ok(Math.abs(a.y - b.y) < 0.01);
    });
  });
});
