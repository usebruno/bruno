const DEFAULT_WINDOW_SIZE = 256 * 1024; // 256 KB
const DEFAULT_MAX_WINDOWS = 3;

/**
 * Sliding-window text for large file-backed bodies.
 * Keeps at most `maxWindows` chunks in memory; scroll forward/back loads
 * the next chunk and evicts the opposite end.
 */
export const createWindowedTextModel = ({
  bodyRef,
  client,
  windowSize = DEFAULT_WINDOW_SIZE,
  maxWindows = DEFAULT_MAX_WINDOWS,
  totalSize = 0
} = {}) => {
  if (!bodyRef || !client) {
    throw new Error('createWindowedTextModel requires bodyRef and client');
  }
  if (maxWindows < 1) {
    throw new Error('maxWindows must be >= 1');
  }

  /** @type {{ offset: number, text: string }[]} */
  let windows = [];
  let size = totalSize;

  const ensureSize = async () => {
    if (size > 0) return size;
    const stat = await client.getStat(bodyRef);
    size = stat.size || 0;
    return size;
  };

  const fetchWindow = async (offset) => {
    const start = Math.max(0, offset);
    await ensureSize();
    if (start >= size) {
      return { offset: start, text: '' };
    }
    const text = await client.readRangeAsText(bodyRef, start, windowSize);
    return { offset: start, text };
  };

  const snapshot = (removedPrefixChars = 0, prependedChars = 0) => {
    const text = windows.map((w) => w.text).join('');
    const startOffset = windows.length ? windows[0].offset : 0;
    const last = windows.length ? windows[windows.length - 1] : null;
    // Byte-aligned end (reads are by windowSize), not JS string length
    const endOffset = last ? Math.min(size, last.offset + windowSize) : 0;
    return {
      text,
      startOffset,
      endOffset,
      size,
      hasMoreForward: endOffset < size,
      hasMoreBackward: startOffset > 0,
      removedPrefixChars,
      prependedChars
    };
  };

  const loadInitial = async () => {
    await ensureSize();
    windows = [await fetchWindow(0)];
    return snapshot();
  };

  /**
   * Append the next chunk after the current end; drop the oldest from the
   * start when over `maxWindows`.
   */
  const shiftForward = async () => {
    await ensureSize();
    if (!windows.length) {
      return loadInitial();
    }

    const last = windows[windows.length - 1];
    const nextOffset = last.offset + windowSize;
    if (nextOffset >= size) {
      return { ...snapshot(), hasMoreForward: false };
    }

    // Already holding this window (e.g. duplicate scroll event)
    if (windows.some((w) => w.offset === nextOffset)) {
      return snapshot();
    }

    const next = await fetchWindow(nextOffset);
    if (!next.text && nextOffset >= size) {
      return { ...snapshot(), hasMoreForward: false };
    }

    windows = [...windows, next];
    let removedPrefixChars = 0;
    while (windows.length > maxWindows) {
      removedPrefixChars += windows[0].text.length;
      windows = windows.slice(1);
    }
    return snapshot(removedPrefixChars, 0);
  };

  /**
   * Prepend the chunk before the current start; drop from the end when over
   * `maxWindows`.
   */
  const shiftBackward = async () => {
    await ensureSize();
    if (!windows.length) {
      return loadInitial();
    }

    const first = windows[0];
    if (first.offset <= 0) {
      return { ...snapshot(), hasMoreBackward: false };
    }

    const prevOffset = Math.max(0, first.offset - windowSize);
    if (windows.some((w) => w.offset === prevOffset)) {
      return snapshot();
    }

    const prev = await fetchWindow(prevOffset);
    windows = [prev, ...windows];
    let prependedChars = prev.text.length;
    while (windows.length > maxWindows) {
      windows = windows.slice(0, -1);
    }
    return snapshot(0, prependedChars);
  };

  return {
    loadInitial,
    shiftForward,
    shiftBackward,
    getText: () => windows.map((w) => w.text).join(''),
    getWindows: () => windows.slice(),
    getWindowSize: () => windowSize,
    getMaxWindows: () => maxWindows,
    getSize: () => size
  };
};
