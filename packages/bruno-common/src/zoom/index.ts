// Convert percentage to zoom level (Electron uses logarithmic scale)
// Formula: percentage = 100 * 1.2^level
export const percentageToZoomLevel = (percentage: number): number => {
  return Math.log(percentage / 100) / Math.log(1.2);
};
