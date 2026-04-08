import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { bus } from '../game/eventBus.js';

// Note: the bus uses a module-level Map, so we need to clean up after tests
describe('eventBus', () => {
  it('on + emit delivers message', () => {
    let received = null;
    const handler = (data) => { received = data; };
    bus.on('test1', handler);
    bus.emit('test1', 'hello');
    assert.strictEqual(received, 'hello');
    bus.off('test1', handler);
  });

  it('off removes handler', () => {
    let count = 0;
    const handler = () => { count++; };
    bus.on('test2', handler);
    bus.emit('test2');
    bus.off('test2', handler);
    bus.emit('test2');
    assert.strictEqual(count, 1);
  });

  it('multiple handlers on same event', () => {
    let a = 0, b = 0;
    const ha = () => { a++; };
    const hb = () => { b++; };
    bus.on('test3', ha);
    bus.on('test3', hb);
    bus.emit('test3');
    assert.strictEqual(a, 1);
    assert.strictEqual(b, 1);
    bus.off('test3', ha);
    bus.off('test3', hb);
  });

  it('emit with no listeners does not throw', () => {
    assert.doesNotThrow(() => bus.emit('nonexistent', 42));
  });

  it('off with non-registered handler does not throw', () => {
    assert.doesNotThrow(() => bus.off('nope', () => {}));
  });

  it('handler can remove itself during emit', () => {
    let count = 0;
    const handler = () => {
      count++;
      bus.off('test4', handler);
    };
    bus.on('test4', handler);
    bus.emit('test4');
    bus.emit('test4');
    assert.strictEqual(count, 1);
  });
});
