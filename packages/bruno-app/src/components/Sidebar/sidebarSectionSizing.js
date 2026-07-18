export const DEFAULT_SECTION_WEIGHT = 1;
export const NEW_SECTION_FRACTION = 0.25;
export const MIN_SECTION_PX = 64;
// Dragging a neighbor's height below this (past its min) collapses the section.
export const COLLAPSE_THRESHOLD_PX = 32;
// The top section never collapses via drag; it stays at least this fraction of
// the shared area so the sash remains reachable (matches VSCode).
export const TOP_MIN_FRACTION = 0.25;

// Weight for a section that should occupy `fraction` of the area shared with its
// already-expanded siblings, leaving the siblings' relative proportions intact.
export const computeExpandWeight = (expandedSiblingWeights, fraction = NEW_SECTION_FRACTION) => {
  const sum = expandedSiblingWeights.reduce((total, weight) => total + (weight > 0 ? weight : 0), 0);
  if (sum <= 0) return DEFAULT_SECTION_WEIGHT;
  return (fraction / (1 - fraction)) * sum;
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
