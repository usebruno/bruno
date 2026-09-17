const LINE_CLASS_TARGET = 'background';
const LINE_CLASS_NAME = 'cm-error-line-flash';
const GUTTER_CLASS_TARGET = 'gutter';
const GUTTER_CLASS_NAME = 'cm-error-line-flash-gutter';

export const focusErrorLine = (editor, line1Based, { durationMs = 3000 } = {}) => {
  if (!editor || typeof line1Based !== 'number' || Number.isNaN(line1Based)) {
    return () => {};
  }

  const lineCount = editor.lineCount();
  const line = Math.max(0, Math.min(line1Based - 1, lineCount - 1));

  try {
    editor.scrollIntoView({ line, ch: 0 }, 80);
    editor.addLineClass(line, LINE_CLASS_TARGET, LINE_CLASS_NAME);
    editor.addLineClass(line, GUTTER_CLASS_TARGET, GUTTER_CLASS_NAME);
  } catch (e) {
    return () => {};
  }

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try {
      editor.removeLineClass(line, LINE_CLASS_TARGET, LINE_CLASS_NAME);
      editor.removeLineClass(line, GUTTER_CLASS_TARGET, GUTTER_CLASS_NAME);
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
