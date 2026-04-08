import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { minimapToGrid } from '../game/minimap.js';

describe('minimap', () => {
  beforeEach(() => resetState());

  it('minimapToGrid returns null when no bounds', () => {
    // minimapBounds is null by default (minimap not drawn)
    const result = minimapToGrid(100, 100);
    assert.strictEqual(result, null);
  });
});
