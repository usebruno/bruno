/**
 * Clamps the request pane height to leave room for the response pane.
 * Returns null if no clamping is needed.
 */
export const clampRequestHeightForResponse = (
  currentRequestHeight,
  containerHeight,
  minResponseHeight,
  minRequestHeight
) => {
  const maxRequestHeight = containerHeight - minResponseHeight;
  if (currentRequestHeight <= maxRequestHeight) return null;
  return Math.max(minRequestHeight, maxRequestHeight);
};
