import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { drawNow } from '../game/gameLoop.js';
import { S } from '../game/state.js';

describe('gameLoop', () => {
  beforeEach(() => resetState());

  it('drawNow clears dirty flag', () => {
    S._dirty = true;
    drawNow();
    assert.strictEqual(S._dirty, false);
  });

  it('drawNow does not throw with empty world', () => {
    S._dirty = true;
    assert.doesNotThrow(() => drawNow());
  });
});
