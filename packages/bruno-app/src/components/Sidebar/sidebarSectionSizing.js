export const DEFAULT_SECTION_WEIGHT = 1;
export const MIN_SECTION_PX = 64;
// Dragging a neighbor's height below this (past its min) collapses the section.
export const COLLAPSE_THRESHOLD_PX = 32;
// The top section never collapses via drag; it stays at least this fraction of
// the shared area so the sash remains reachable (matches VSCode).
export const TOP_MIN_FRACTION = 0.25;

// Lays out the expanded sections when a new one is opened, VSCode-style: the new
// section opens at an equal 1/N share of the shared area, and that space is
// reclaimed from the other sections' slack (height above the minimum) starting
// with the neighbour directly above the new section and cascading outward — up
// first, then down. A section already at its minimum gives nothing; if the total
// available slack is less than the new section's share, the new section opens
// smaller (whatever slack allowed).
//
// `oldHeights` are the existing expanded sections' pixel heights in visual order;
// `newIndex` is the position the new section takes in the resulting order.
// Returns the full ordered list of N heights (new section inserted at newIndex).
export const resolveExpandHeights = ({ oldHeights, newIndex, areaPx, minPx = MIN_SECTION_PX }) => {
  const count = oldHeights.length + 1;
  const target = areaPx / count;

  const reduced = [...oldHeights];
  // Reclaim order: nearest neighbour above the new section first, then further up,
  // then the neighbours below.
  const order = [];
  for (let i = newIndex - 1; i >= 0; i--) order.push(i);
  for (let i = newIndex; i < reduced.length; i++) order.push(i);

  let remaining = target;
  for (const i of order) {
    if (remaining <= 0) break;
    const slack = Math.max(0, reduced[i] - minPx);
    const give = Math.min(slack, remaining);
    reduced[i] -= give;
    remaining -= give;
  }

  const newHeight = target - remaining; // short of target if slack ran out
  return [...reduced.slice(0, newIndex), newHeight, ...reduced.slice(newIndex)];
};

// Given the two neighbors' pixel heights and a drag delta, return new weights that
// preserve their combined weight. The delta is clamped so neither neighbor goes
// below `minPx`.
export const computeSashTransfer = ({
  abovePx,
  belowPx,
  deltaPx,
  combinedWeight,
  minPx = MIN_SECTION_PX,
  minAbovePx = minPx,
  minBelowPx = minPx
}) => {
  const totalPx = abovePx + belowPx;
  const minDelta = minAbovePx - abovePx;
  const maxDelta = belowPx - minBelowPx;
  const clampedDelta = Math.max(minDelta, Math.min(maxDelta, deltaPx));
  const newAbovePx = abovePx + clampedDelta;
  const weightAbove = combinedWeight * (newAbovePx / totalPx);
  const weightBelow = combinedWeight - weightAbove;
  return { weightAbove, weightBelow };
};

// Decides what a sash drag does given the neighbours' start heights and the
// cumulative delta. Returns either a collapse of one side, or the new weights.
// Positive delta drags the sash down (grows `above`, shrinks `below`).
export const resolveSashDrag = ({ abovePx, belowPx, deltaPx, combinedWeight, aboveIsTop }) => {
  if (belowPx - deltaPx < COLLAPSE_THRESHOLD_PX) {
    return { action: 'collapse', side: 'below' };
  }
  // The top section never collapses via drag; it floors instead (see below).
  if (!aboveIsTop && abovePx + deltaPx < COLLAPSE_THRESHOLD_PX) {
    return { action: 'collapse', side: 'above' };
  }

  const minAbovePx = aboveIsTop
    ? Math.max(MIN_SECTION_PX, TOP_MIN_FRACTION * (abovePx + belowPx))
    : MIN_SECTION_PX;
  const { weightAbove, weightBelow } = computeSashTransfer({
    abovePx,
    belowPx,
    deltaPx,
    combinedWeight,
    minAbovePx,
    minBelowPx: MIN_SECTION_PX
  });
  return { action: 'resize', weightAbove, weightBelow };
};
