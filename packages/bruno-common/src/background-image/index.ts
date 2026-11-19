export const BACKGROUND_IMAGE_MODES = ['fill', 'fit', 'stretch', 'center', 'tile'] as const;
export const MAX_BACKGROUND_TRANSPARENCY = 95;
export const MAX_BACKGROUND_BLUR = 20;

export const DEFAULT_BACKGROUND_DISPLAY = {
  mode: 'fill',
  transparency: 20,
  blur: 0
} as const;

type BackgroundDisplay = {
  mode: (typeof BACKGROUND_IMAGE_MODES)[number];
  transparency: number;
  blur: number;
};

function normalizeNumber(value: unknown, maximum: number, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, Math.round(value)))
    : fallback;
}

export function normalizeBackgroundDisplay(settings?: Partial<BackgroundDisplay> | null): BackgroundDisplay {
  const mode = settings?.mode;
  return {
    mode: mode && BACKGROUND_IMAGE_MODES.includes(mode) ? mode : DEFAULT_BACKGROUND_DISPLAY.mode,
    transparency: normalizeNumber(settings?.transparency, MAX_BACKGROUND_TRANSPARENCY, DEFAULT_BACKGROUND_DISPLAY.transparency),
    blur: normalizeNumber(settings?.blur, MAX_BACKGROUND_BLUR, DEFAULT_BACKGROUND_DISPLAY.blur)
  };
}
