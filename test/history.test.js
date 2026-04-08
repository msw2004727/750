import './helpers/dom-stub.js';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resetState } from './helpers/state-factory.js';
import { saveSnapshot, doUndo, doRedo } from '../game/history.js';
import { addBlock } from '../game/spatialHash.js';
import { S, world } from '../game/state.js';

describe('history', () => {
  beforeEach(() => resetState());

  it('saveSnapshot pushes to history', () => {
    addBlock({ gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
    saveSnapshot();
    assert.strictEqual(S.history.length, 1);
  });

  it('saveSnapshot clears redo stack', () => {
    saveSnapshot();
    S.redoStack.push('something');
    saveSnapshot();
    assert.strictEqual(S.redoStack.length, 0);
  });

  it('doUndo restores previous state', () => {
    // State 1: empty
    saveSnapshot();
    // State 2: one block
    addBlock({ gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
    assert.strictEqual(world.blocks.length, 1);
    doUndo();
    assert.strictEqual(world.blocks.length, 0);
  });

  it('doRedo re-applies undone state', () => {
    // Snapshot empty state, add block, snapshot again, then undo/redo
    saveSnapshot(); // history = [0 blocks]
    addBlock({ gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
    saveSnapshot(); // history = [0 blocks, 1 block]
    addBlock({ gx: 1, gy: 0, gz: 0, layer: 0, color: 't001', srcH: 32 });
    assert.strictEqual(world.blocks.length, 2);
    doUndo(); // back to 1 block (popped from history)
    assert.strictEqual(world.blocks.length, 1);
    doRedo(); // forward to 2 blocks (popped from redo)
    assert.strictEqual(world.blocks.length, 2);
  });

  it('doUndo with empty history does nothing', () => {
    addBlock({ gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
    doUndo();
    assert.strictEqual(world.blocks.length, 1);
  });

  it('doRedo with empty redo stack does nothing', () => {
    doRedo();
    assert.strictEqual(world.blocks.length, 0);
  });

  it('history cap is 50', () => {
    for (let i = 0; i < 60; i++) saveSnapshot();
    assert.strictEqual(S.history.length, 50);
  });

  it('multiple undo/redo cycle is consistent', () => {
    // empty
    saveSnapshot(); // history[0] = empty
    addBlock({ gx: 0, gy: 0, gz: 0, layer: 0, color: 't000', srcH: 32 });
    saveSnapshot(); // history[1] = 1 block
    addBlock({ gx: 1, gy: 0, gz: 0, layer: 0, color: 't001', srcH: 32 });
    // current: 2 blocks
    assert.strictEqual(world.blocks.length, 2);
    doUndo(); // back to 1 block
    assert.strictEqual(world.blocks.length, 1);
    doUndo(); // back to 0
    assert.strictEqual(world.blocks.length, 0);
    doRedo(); // forward to 1
    assert.strictEqual(world.blocks.length, 1);
    doRedo(); // forward to 2
    assert.strictEqual(world.blocks.length, 2);
  });
});
