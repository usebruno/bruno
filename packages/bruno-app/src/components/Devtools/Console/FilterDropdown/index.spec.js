import { computeMenuStyle } from './index';

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 4;

// Fake trigger element with a fixed bounding rect.
const triggerAt = ({ top, bottom, right = 100 }) => ({
  getBoundingClientRect: () => ({ top, bottom, right })
});

// The menu is fixed-positioned from the top; its bounds are [top, top + maxHeight].
const withinViewport = (style, innerHeight) =>
  style.top >= 0 && style.top + style.maxHeight <= innerHeight;

describe('computeMenuStyle', () => {
  it('returns null when there is no element', () => {
    expect(computeMenuStyle(null, 1000, 800)).toBeNull();
  });

  it('opens directly below the trigger', () => {
    const style = computeMenuStyle(triggerAt({ top: 100, bottom: 120 }), 1000, 800);
    expect(style.position).toBe('fixed');
    expect(style.top).toBe(120 + TRIGGER_GAP);
    expect(style.right).toBe(900); // innerWidth - rect.right
  });

  it('caps maxHeight to the room below so the list scrolls when space is tight', () => {
    const style = computeMenuStyle(triggerAt({ top: 100, bottom: 120 }), 1000, 800);
    expect(style.maxHeight).toBe(800 - 124 - VIEWPORT_MARGIN);
  });

  it('never lets the menu exceed the viewport (top + maxHeight <= innerHeight)', () => {
    // A trigger near the bottom of a docked devtools panel.
    const style = computeMenuStyle(triggerAt({ top: 560, bottom: 580 }), 1000, 800);
    expect(withinViewport(style, 800)).toBe(true);
    expect(style.top + style.maxHeight).toBe(800 - VIEWPORT_MARGIN);
  });
});
