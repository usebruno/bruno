// Variant -> CSS classes + flash duration. 'error' is the original red ~3s flash; 'info' is a
// neutral ~1s flash reused by non-error callers (e.g. jumping to a script-set header's line).
const VARIANTS = {
  error: { lineClass: 'cm-error-line-flash', gutterClass: 'cm-error-line-flash-gutter', durationMs: 3000 },
  info: { lineClass: 'cm-focus-line-flash', gutterClass: 'cm-focus-line-flash-gutter', durationMs: 1000 }
};

export const focusErrorLine = (editor, line1Based, { variant = 'error' } = {}) => {
  if (!editor || typeof line1Based !== 'number' || Number.isNaN(line1Based)) {
    return () => {};
  }

  const { lineClass, gutterClass, durationMs } = VARIANTS[variant] || VARIANTS.error;

  const lineCount = editor.lineCount();
  const line = Math.max(0, Math.min(line1Based - 1, lineCount - 1));

  try {
    editor.scrollIntoView({ line, ch: 0 }, 80);
    editor.addLineClass(line, 'background', lineClass);
    editor.addLineClass(line, 'gutter', gutterClass);
  } catch (e) {
    return () => {};
  }

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try {
      editor.removeLineClass(line, 'background', lineClass);
      editor.removeLineClass(line, 'gutter', gutterClass);
    } catch (e) {
      // editor may have been swapped out; nothing to clean up
    }
  };

  const timer = setTimeout(dispose, durationMs);

  return () => {
    clearTimeout(timer);
    dispose();
  };
};
