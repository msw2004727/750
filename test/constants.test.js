import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { TILE, TW, TH, CUBE_H } from '../game/constants.js';

describe('constants', () => {
  it('TILE is 40', () => {
    assert.strictEqual(TILE, 40);
  });

  it('TW = TILE * cos(30°)', () => {
    assert.ok(Math.abs(TW - TILE * Math.cos(Math.PI / 6)) < 1e-10);
  });

  it('TH = TILE * sin(30°)', () => {
    assert.ok(Math.abs(TH - TILE * Math.sin(Math.PI / 6)) < 1e-10);
  });

  it('CUBE_H = TILE * 0.8', () => {
    assert.strictEqual(CUBE_H, TILE * 0.8);
  });

  it('isometric ratio: TH/TW ≈ 0.577 (tan 30°)', () => {
    assert.ok(Math.abs(TH / TW - Math.tan(Math.PI / 6)) < 1e-10);
  });
});
