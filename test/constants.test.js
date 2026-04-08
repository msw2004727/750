import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { TILE, ANG, COS, SIN, TW, TH, CUBE_H } from '../game/constants.js';

describe('constants', () => {
  it('TILE is 40', () => {
    assert.strictEqual(TILE, 40);
  });

  it('ANG is 30 degrees in radians', () => {
    assert.ok(Math.abs(ANG - Math.PI / 6) < 1e-10);
  });

  it('COS and SIN are consistent with ANG', () => {
    assert.ok(Math.abs(COS - Math.cos(ANG)) < 1e-10);
    assert.ok(Math.abs(SIN - Math.sin(ANG)) < 1e-10);
  });

  it('TW = TILE * COS', () => {
    assert.ok(Math.abs(TW - TILE * COS) < 1e-10);
  });

  it('TH = TILE * SIN', () => {
    assert.ok(Math.abs(TH - TILE * SIN) < 1e-10);
  });

  it('CUBE_H = TILE * 0.8', () => {
    assert.strictEqual(CUBE_H, TILE * 0.8);
  });

  it('isometric ratio: TH/TW ≈ 0.577 (tan 30°)', () => {
    assert.ok(Math.abs(TH / TW - Math.tan(ANG)) < 1e-10);
  });
});
