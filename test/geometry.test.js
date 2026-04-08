import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { getRectCells, getLineCells, floodFill } from '../game/geometry.js';

describe('getRectCells', () => {
  it('returns single cell for point rect', () => {
    assert.deepStrictEqual(getRectCells(3, 3, 3, 3), [[3, 3]]);
  });

  it('returns correct count for 3x3', () => {
    assert.strictEqual(getRectCells(0, 0, 2, 2).length, 9);
  });

  it('works with inverted coordinates', () => {
    const a = getRectCells(0, 0, 2, 2);
    const b = getRectCells(2, 2, 0, 0);
    assert.deepStrictEqual(a, b);
  });

  it('handles negative coordinates', () => {
    const cells = getRectCells(-1, -1, 1, 1);
    assert.strictEqual(cells.length, 9);
    assert.ok(cells.some(([x, y]) => x === -1 && y === -1));
    assert.ok(cells.some(([x, y]) => x === 1 && y === 1));
  });

  it('handles 1xN rectangle', () => {
    const cells = getRectCells(0, 0, 0, 4);
    assert.strictEqual(cells.length, 5);
    for (const [x] of cells) assert.strictEqual(x, 0);
  });
});

describe('getLineCells', () => {
  it('returns two cells for adjacent horizontal', () => {
    assert.deepStrictEqual(getLineCells(0, 0, 1, 0), [[0, 0], [1, 0]]);
  });

  it('returns single cell for same start/end', () => {
    assert.deepStrictEqual(getLineCells(5, 5, 5, 5), [[5, 5]]);
  });

  it('starts and ends at correct positions', () => {
    const cells = getLineCells(0, 0, 5, 3);
    assert.deepStrictEqual(cells[0], [0, 0]);
    assert.deepStrictEqual(cells[cells.length - 1], [5, 3]);
  });

  it('handles reverse direction', () => {
    const cells = getLineCells(3, 3, 0, 0);
    assert.deepStrictEqual(cells[0], [3, 3]);
    assert.deepStrictEqual(cells[cells.length - 1], [0, 0]);
  });

  it('produces connected path (no gaps)', () => {
    const cells = getLineCells(0, 0, 7, 3);
    for (let i = 1; i < cells.length; i++) {
      const dx = Math.abs(cells[i][0] - cells[i - 1][0]);
      const dy = Math.abs(cells[i][1] - cells[i - 1][1]);
      assert.ok(dx <= 1 && dy <= 1, `gap at index ${i}`);
    }
  });
});

describe('floodFill', () => {
  it('fills open area up to maxCount', () => {
    const result = floodFill(0, 0, () => false, 10);
    assert.ok(result.length >= 1 && result.length <= 10, `got ${result.length}`);
  });

  it('returns empty if start is blocked', () => {
    assert.strictEqual(floodFill(0, 0, () => true, 500).length, 0);
  });

  it('does not cross blocked cells', () => {
    // Surround (0,0) on all 4 sides
    const walls = new Set(['1,0', '-1,0', '0,1', '0,-1']);
    const result = floodFill(0, 0, (x, y) => walls.has(x + ',' + y), 500);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], [0, 0]);
  });

  it('fills L-shaped area correctly', () => {
    // Block everything except an L: (0,0),(1,0),(2,0),(2,1),(2,2)
    const open = new Set(['0,0', '1,0', '2,0', '2,1', '2,2']);
    const result = floodFill(0, 0, (x, y) => !open.has(x + ',' + y), 500);
    assert.strictEqual(result.length, 5);
  });

  it('defaults to 500 maxCount', () => {
    const result = floodFill(0, 0, () => false);
    assert.ok(result.length > 0 && result.length <= 500, `got ${result.length}`);
  });
});
