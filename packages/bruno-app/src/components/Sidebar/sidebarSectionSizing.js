export const DEFAULT_SECTION_WEIGHT = 1;
// A section can be dragged down to this height but no further; dragging never
// collapses a section (matches VSCode — close it by clicking its header).
export const MIN_SECTION_PX = 100;

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
  // Reclaim from the nearest neighbours first, fanning outward from the new
  // section — the section directly above, then directly below, then the next
  // ones out (above preferred at equal distance). `reduced[newIndex-1]` is the
  // neighbour above, `reduced[newIndex]` the neighbour below.
  const order = [];
  let up = newIndex - 1;
  let down = newIndex;
  while (up >= 0 || down < reduced.length) {
    if (up >= 0) order.push(up--);
    if (down < reduced.length) order.push(down++);
  }

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

// Given the two neighbours' pixel heights and a cumulative drag delta, return new
// weights that preserve their combined weight. The delta is clamped so neither
// neighbour drops below `minPx` — dragging never collapses a section.
// Positive delta drags the sash down (grows `above`, shrinks `below`).
export const computeSashTransfer = ({ abovePx, belowPx, deltaPx, combinedWeight, minPx = MIN_SECTION_PX }) => {
  const totalPx = abovePx + belowPx;
  const minDelta = minPx - abovePx;
  const maxDelta = belowPx - minPx;
  const clampedDelta = Math.max(minDelta, Math.min(maxDelta, deltaPx));
  const newAbovePx = abovePx + clampedDelta;
  const weightAbove = combinedWeight * (newAbovePx / totalPx);
  const weightBelow = combinedWeight - weightAbove;
  return { weightAbove, weightBelow };
};
