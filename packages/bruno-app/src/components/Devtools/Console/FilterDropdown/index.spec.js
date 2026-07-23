import { computeMenuStyle } from './index';

// Fake trigger element with a fixed bounding rect.
const triggerAt = ({ top, bottom, right = 100 }) => ({
  getBoundingClientRect: () => ({ top, bottom, right })
});

describe('computeMenuStyle', () => {
  it('returns null when there is no element', () => {
    expect(computeMenuStyle(null, 1000, 800)).toBeNull();
  });

  it('always opens below the trigger', () => {
    const style = computeMenuStyle(triggerAt({ top: 100, bottom: 120 }), 1000, 800);
    expect(style.position).toBe('fixed');
    expect(style.top).toBe(124); // rect.bottom + 4
    expect(style.bottom).toBeUndefined(); // never flips above
    expect(style.right).toBe(900); // innerWidth - rect.right
  });

  it('caps maxHeight to the room below so the list scrolls', () => {
    const style = computeMenuStyle(triggerAt({ top: 100, bottom: 120 }), 1000, 800);
    expect(style.maxHeight).toBe(672); // innerHeight - rect.bottom - 8
  });

  it('clamps to a minimum height when the trigger is near the viewport bottom', () => {
    // Only 12px below the trigger -> would clip; clamp keeps it usable + scrollable.
    const style = computeMenuStyle(triggerAt({ top: 760, bottom: 780 }), 1000, 800);
    expect(style.top).toBe(784);
    expect(style.maxHeight).toBe(120); // Math.max(12, MIN_MENU_HEIGHT)
  });

  it('never yields a negative maxHeight even when there is no room below', () => {
    // Trigger sits below the viewport fold -> spaceBelow is negative.
    const style = computeMenuStyle(triggerAt({ top: 820, bottom: 840 }), 1000, 800);
    expect(style.maxHeight).toBe(120); // clamped, not -48
  });
});
