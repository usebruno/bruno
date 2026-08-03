import { clampRequestHeightForResponse } from './paneSize';

// Mirrors RequestTabPanel's constants
const MIN_TOP_PANE_HEIGHT = 150;
const RESPONSE_EXPAND_MIN_HEIGHT = 300;

const clamp = (currentRequestHeight, containerHeight) =>
  clampRequestHeightForResponse(currentRequestHeight, containerHeight, RESPONSE_EXPAND_MIN_HEIGHT, MIN_TOP_PANE_HEIGHT);

describe('clampRequestHeightForResponse', () => {
  it('shrinks the request pane so the response opens without squishing', () => {
    const containerHeight = 800;
    const result = clamp(760, containerHeight);
    expect(result).toBe(500);
  });

  it('floors at the request minimum in a short window', () => {
    const containerHeight = 400;
    const result = clamp(380, containerHeight);
    expect(result).toBe(MIN_TOP_PANE_HEIGHT);
  });

  it('floors at the request minimum even when the window cannot fit both panes', () => {
    // 200px container results in a negative maxRequestHeight, so the MIN_TOP_PANE_HEIGHT is returned.
    expect(clamp(380, 200)).toBe(MIN_TOP_PANE_HEIGHT);
  });

  it('returns null when the response already has enough room, no clamping needed', () => {
    // Request with height 400 leaves the response with enough room, so no clamping is needed.
    expect(clamp(400, 1000)).toBeNull();
  });
});
