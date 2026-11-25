// [fork] Glas overview masonry: row span of a cell (app/glas/useGlasMasonry.ts)
import { describe, expect, it } from 'vitest';
import { masonrySpan } from '../src/app/glas/useGlasMasonry';

describe('masonrySpan', () => {
  it('covers the card and its gap, rounded up to whole rows', () => {
    expect(masonrySpan(400, 26)).toBe(107); // 426 / 4 = 106.5
    expect(masonrySpan(398, 26)).toBe(106); // exactly 424
  });
  it('an empty cell takes one row and no gap', () => {
    expect(masonrySpan(0, 26)).toBe(1);
  });
  it('honours another row height', () => {
    expect(masonrySpan(100, 20, 10)).toBe(12);
  });
});
