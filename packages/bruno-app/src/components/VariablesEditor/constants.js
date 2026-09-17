export const OBJECT_CELL_MAX_HEIGHT = '120px';

/**
 * A section header pins to the top of the scroller and the table header parks
 * directly beneath it, so both offsets are driven from this one value.
 */
export const SECTION_HEADER_HEIGHT = '38px';

export const MIN_DRAWER_WIDTH = 280;

export const DEFAULT_DRAWER_WIDTH = 400;

export const DRAWER_MAX_RATIO = 0.6;

export const SCROLL_SAVE_DEBOUNCE_MS = 200;

/**
 * TableVirtuoso mounts into the shared scroll parent and briefly forces scroll
 * to the top (initialTopMostItemIndex=0). Hold the restored position for a
 * short window so that reset does not stick.
 */
export const SCROLL_RESTORE_GUARD_MS = 400;

/**
 * A scrollTop under this many pixels counts as "at the top". Exact 0 is too
 * strict: layout, subpixel rounding, and Virtuoso's brief reset often leave
 * 1-4px. 5 stays small enough that a real user scroll is not read as the top.
 */
export const SCROLL_TOP_EPSILON = 5;

/**
 * How long to wait before accepting a near-zero scrollTop as the user's real
 * position, so Virtuoso's teardown reset is not persisted.
 */
export const SCROLL_ZERO_ACCEPT_DELAY_MS = 75;

export const COPY_FEEDBACK_MS = 1200;

export const JSON_MODE = 'application/ld+json';

export const VARIABLE_REFERENCE_PATTERN = /\{\{([^}]+)\}\}/;
