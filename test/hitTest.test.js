import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { hitTest, hitTestAll } from '../game/hitTest.js';
import { addBlock } from '../game/spatialHash.js';
import { toScreen } from '../game/coords.js';
import { S, camera } from '../game/state.js';

describe('hitTest', () => {
  beforeEach(() => {
    resetState();
    camera.x = 0; camera.y = 0; camera.zoom = 1;
    camera.W = 800; camera.H = 600;
  });

  it('returns null on empty world', () => {
    assert.strictEqual(hitTest(400, 300), null);
  });

  it('finds block at its screen center', () => {
    const b = { gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 };
    addBlock(b);
    S.currentHeight = 0;
    S.currentLayer = 0;
    const s = toScreen(0, 0, 0);
    // Slightly below top to be inside the cube
    const result = hitTest(s.x, s.y + 5);
    assert.strictEqual(result, b);
  });

  it('does not find block at wrong height', () => {
    const b = { gx: 0, gy: 0, gz: 1, layer: 0, color: 't000', srcH: 32 };
    addBlock(b);
    S.currentHeight = 0;
    S.currentLayer = 0;
    const s = toScreen(0, 0, 1);
    assert.strictEqual(hitTest(s.x, s.y + 5), null);
  });

  it('does not find block at wrong layer', () => {
    const b = { gx: 0, gy: 0, gz: 0, layer: 1, color: 't000', srcH: 32 };
    addBlock(b);
    S.currentHeight = 0;
    S.currentLayer = 0;
    const s = toScreen(0, 0, 0);
    assert.strictEqual(hitTest(s.x, s.y + 5), null);
  });
});

describe('hitTestAll', () => {
  beforeEach(() => {
    resetState();
    camera.x = 0; camera.y = 0; camera.zoom = 1;
    camera.W = 800; camera.H = 600;
  });

  it('finds block at any height', () => {
    const b = { gx: 0, gy: 0, gz: 3, layer: 0, color: 't000', srcH: 32 };
    addBlock(b);
    S.currentHeight = 0; // different from block
    const s = toScreen(0, 0, 3);
    const result = hitTestAll(s.x, s.y + 5);
    assert.strictEqual(result, b);
  });

  it('finds front block when overlapping', () => {
    const back = { gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 };
    const front = { gx: 1, gy: 1, gz: 0, layer: 0, color: 't001', srcH: 32 };
    addBlock(back);
    addBlock(front);
    // front block (higher gx+gy) should be found first
    const sf = toScreen(1, 1, 0);
    const result = hitTestAll(sf.x, sf.y + 5);
    assert.strictEqual(result, front);
  });
});
