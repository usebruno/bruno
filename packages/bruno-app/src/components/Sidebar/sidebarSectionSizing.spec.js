import {
  computeSashTransfer,
  resolveExpandHeights
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

  it('a middle insert pulls from its nearest neighbours, leaving far sections untouched', () => {
    // 4 sections at 300 each; open a 5th in the middle (index 2), target = 1500/5 = 300.
    const heights = resolveExpandHeights({ oldHeights: [300, 300, 300, 300], newIndex: 2, areaPx: 1500, minPx: 100 });
    // above-adjacent drains to min (200 given), below-adjacent gives the rest (100);
    // the outermost sections keep their 300.
    expect(heights).toEqual([300, 100, 300, 200, 300]);
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

  it('clamps a large up-drag at the minimum instead of collapsing', () => {
    // above 600, below 200, min 100; a huge up-drag can only shrink above to 100
    const { weightAbove, weightBelow } = computeSashTransfer({
      abovePx: 600, belowPx: 200, deltaPx: -1000, combinedWeight: 4, minPx: 100
    });
    expect(weightAbove).toBeCloseTo(4 * (100 / 800), 5); // above floored at 100px
    expect(weightBelow).toBeCloseTo(4 * (700 / 800), 5);
  });
});
