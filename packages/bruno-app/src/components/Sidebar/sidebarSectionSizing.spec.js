import {
  computeSashTransfer,
  resolveExpandHeights,
  resolveSashDrag
} from './sidebarSectionSizing';

describe('resolveExpandHeights', () => {
  it('opens the second section at 50% of a two-section sidebar', () => {
    // one section fills the 900px area; expanding a second below it
    const heights = resolveExpandHeights({ oldHeights: [900], newIndex: 1, areaPx: 900, minPx: 64 });
    expect(heights).toEqual([450, 450]);
  });

  it('takes the new section (1/3) from the neighbour above, leaving the far section untouched', () => {
    // Collections 225, API Specs 675; open a third below -> 3rd takes 300 from API Specs
    const heights = resolveExpandHeights({ oldHeights: [225, 675], newIndex: 2, areaPx: 900, minPx: 100 });
    expect(heights).toEqual([225, 375, 300]);
  });

  it('cascades past a neighbour that is already at its minimum', () => {
    // API Specs pinned at min 100; the third opens taking its space from Collections instead
    const heights = resolveExpandHeights({ oldHeights: [700, 100], newIndex: 2, areaPx: 900, minPx: 100 });
    expect(heights).toEqual([400, 100, 300]);
  });

  it('takes from the neighbour below when the new section opens at the top', () => {
    const heights = resolveExpandHeights({ oldHeights: [675, 225], newIndex: 0, areaPx: 900, minPx: 100 });
    expect(heights).toEqual([300, 375, 225]);
  });

  it('opens smaller than 1/N when the other sections have no slack to give', () => {
    // both existing already at min 100; area only 900, target 300 but no slack
    const heights = resolveExpandHeights({ oldHeights: [100, 100], newIndex: 2, areaPx: 900, minPx: 100 });
    expect(heights).toEqual([100, 100, 0]); // new gets whatever slack allowed (none)
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
