/**
 * Refreshes a CodeMirror editor when its container size changes.
 * CodeMirror measures its DOM during refresh(), so resize callbacks are
 * coalesced into a single animation frame to avoid repeated layout work.
 *
 * @param {Object} editor - CodeMirror editor instance
 * @param {HTMLElement} element - Element whose size changes should refresh the editor
 * @returns {Function} Cleanup function
 */
export const setupCodeMirrorResizeRefresh = (editor, element) => {
  if (!editor || !element || typeof ResizeObserver === 'undefined') {
    return () => {};
  }

  let resizeRefreshFrameId = null;

  const resizeObserver = new ResizeObserver(() => {
    if (resizeRefreshFrameId) {
      cancelAnimationFrame(resizeRefreshFrameId);
    }

    resizeRefreshFrameId = requestAnimationFrame(() => {
      editor.refresh?.();
      resizeRefreshFrameId = null;
    });
  });

  resizeObserver.observe(element);

  return () => {
    resizeObserver.disconnect();

    if (resizeRefreshFrameId) {
      cancelAnimationFrame(resizeRefreshFrameId);
      resizeRefreshFrameId = null;
    }
  };
};
