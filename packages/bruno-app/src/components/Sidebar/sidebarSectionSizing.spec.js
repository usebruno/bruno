import {
  DEFAULT_SECTION_WEIGHT,
  computeExpandWeight,
  computeSashTransfer
} from './sidebarSectionSizing';

describe('computeExpandWeight', () => {
  it('returns the default weight when there are no expanded siblings', () => {
    expect(computeExpandWeight([], 0.2)).toBe(DEFAULT_SECTION_WEIGHT);
  });

  it('gives the new section ~20% of the combined area (single sibling)', () => {
    const w = computeExpandWeight([1], 0.2);
    expect(w).toBeCloseTo(0.25, 5); // 0.25 / (0.25 + 1) = 0.2
  });

  it('gives the new section ~20% with multiple siblings, keeping their proportions', () => {
    const w = computeExpandWeight([2, 2], 0.2);
    expect(w).toBeCloseTo(1, 5); // 1 / (1 + 4) = 0.2
  });

  it('ignores non-positive sibling weights', () => {
    expect(computeExpandWeight([0, -3], 0.2)).toBe(DEFAULT_SECTION_WEIGHT);
  });
});

describe('computeSashTransfer', () => {
  it('transfers height between neighbors and preserves the combined weight', () => {
    const { weightAbove, weightBelow } = computeSashTransfer({
      abovePx: 800, belowPx: 200, deltaPx: -100, combinedWeight: 5, minPx: 64
    });
    expect(weightAbove).toBeCloseTo(3.5, 5); // 5 * 700/1000
    expect(weightBelow).toBeCloseTo(1.5, 5);
    expect(weightAbove + weightBelow).toBeCloseTo(5, 5);
  });

  it('clamps the drag so neither neighbor drops below minPx', () => {
    const { weightAbove, weightBelow } = computeSashTransfer({
      abovePx: 100, belowPx: 200, deltaPx: -100, combinedWeight: 3, minPx: 64
    });
    // delta clamped to (64 - 100) = -36 -> above 64px, below 236px of 300px total
    expect(weightAbove).toBeCloseTo(3 * (64 / 300), 5);
    expect(weightBelow).toBeCloseTo(3 * (236 / 300), 5);
  });
});
