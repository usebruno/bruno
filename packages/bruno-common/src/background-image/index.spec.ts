import { DEFAULT_BACKGROUND_DISPLAY, normalizeBackgroundDisplay } from './index';

describe('normalizeBackgroundDisplay', () => {
  it('supplies defaults for older preferences', () => {
    expect(normalizeBackgroundDisplay()).toEqual(DEFAULT_BACKGROUND_DISPLAY);
  });

  it('preserves a supported display mode and clamps the slider values', () => {
    expect(normalizeBackgroundDisplay({ mode: 'tile', transparency: 120, blur: -5 }))
      .toEqual({ mode: 'tile', transparency: 95, blur: 0 });
  });

  it('replaces invalid persisted values with defaults', () => {
    const saved = JSON.parse('{"mode":"unknown","blur":"8"}');
    expect(normalizeBackgroundDisplay(saved)).toEqual(DEFAULT_BACKGROUND_DISPLAY);
  });
});
