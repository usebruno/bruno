import {
  DEFAULT_SECTION_WEIGHT,
  NEW_SECTION_FRACTION,
  computeExpandWeight,
  computeSashTransfer,
  resolveSashDrag
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

  it('honors a larger minAbovePx floor for the top section', () => {
    // container 800px, top floored at 25% = 200px; big up-drag should stop there
    const { weightAbove, weightBelow } = computeSashTransfer({
      abovePx: 600, belowPx: 200, deltaPx: -1000, combinedWeight: 4, minAbovePx: 200, minBelowPx: 64
    });
    expect(weightAbove).toBeCloseTo(4 * (200 / 800), 5); // top stays at 200px
    expect(weightBelow).toBeCloseTo(4 * (600 / 800), 5);
  });
});

describe('resolveSashDrag', () => {
  const base = { abovePx: 400, belowPx: 400, combinedWeight: 2 };

  it('resizes proportionally on a normal drag', () => {
    const r = resolveSashDrag({ ...base, deltaPx: 100, aboveIsTop: false });
    expect(r.action).toBe('resize');
    expect(r.weightAbove).toBeCloseTo(2 * (500 / 800), 5); // above 400->500
    expect(r.weightBelow).toBeCloseTo(2 * (300 / 800), 5);
  });

  it('collapses the bottom section when dragged down past the threshold', () => {
    // below 400 - 390 = 10px < 32 collapse threshold
    const r = resolveSashDrag({ ...base, deltaPx: 390, aboveIsTop: false });
    expect(r).toEqual({ action: 'collapse', side: 'below' });
  });

  it('collapses a non-top above section when dragged up past the threshold', () => {
    // above 400 + (-390) = 10px < 32
    const r = resolveSashDrag({ ...base, deltaPx: -390, aboveIsTop: false });
    expect(r).toEqual({ action: 'collapse', side: 'above' });
  });

  it('never collapses the top section — it floors at 25% of the shared area', () => {
    const r = resolveSashDrag({ abovePx: 600, belowPx: 200, deltaPx: -1000, combinedWeight: 4, aboveIsTop: true });
    expect(r.action).toBe('resize');
    expect(r.weightAbove).toBeCloseTo(4 * (200 / 800), 5); // floored at 25% = 200px
    expect(r.weightBelow).toBeCloseTo(4 * (600 / 800), 5);
  });

  it('still collapses the bottom even when the above is the top section', () => {
    const r = resolveSashDrag({ abovePx: 400, belowPx: 400, deltaPx: 390, combinedWeight: 2, aboveIsTop: true });
    expect(r).toEqual({ action: 'collapse', side: 'below' });
  });
});

describe('NEW_SECTION_FRACTION default', () => {
  it('opens a newly expanded section at 25% next to one existing section', () => {
    const w = computeExpandWeight([1], NEW_SECTION_FRACTION);
    expect(w / (w + 1)).toBeCloseTo(0.25, 5);
  });
});
