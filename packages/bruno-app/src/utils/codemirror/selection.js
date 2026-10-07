const comparePositions = (a, b) => (a.line - b.line) || (a.ch - b.ch);

const isPositionWithinRange = (position, from, to) =>
  comparePositions(position, from) >= 0 && comparePositions(position, to) <= 0;

export const getCodeMirrorSelectionPayload = (editor, event) => {
  if (!editor || typeof editor.somethingSelected !== 'function' || !editor.somethingSelected()) {
    return null;
  }

  // getSelection() concatenates every range; read the text back so it matches the range we replace.
  const from = editor.getCursor('from');
  const to = editor.getCursor('to');
  const text = editor.getRange(from, to);

  if (!text || !text.trim()) {
    return null;
  }

  if (event && typeof editor.coordsChar === 'function') {
    // clientX/clientY are viewport-relative; CodeMirror defaults to page.
    const clicked = editor.coordsChar({ left: event.clientX, top: event.clientY }, 'window');
    if (clicked && !isPositionWithinRange(clicked, from, to)) {
      return null;
    }
  }

  return {
    text,
    from,
    to,
    editable: !editor.getOption('readOnly')
  };
};

const BRACE_LENGTH = 2;

// Swallow a wrapping pair so selecting inside `{{var}}` replaces the reference instead of nesting it.
const expandOverWrappingBraces = (editor, from, to) => {
  if (from.ch < BRACE_LENGTH) {
    return { from, to };
  }

  const openingFrom = { line: from.line, ch: from.ch - BRACE_LENGTH };
  const closingTo = { line: to.line, ch: to.ch + BRACE_LENGTH };

  if (editor.getRange(openingFrom, from) !== '{{' || editor.getRange(to, closingTo) !== '}}') {
    return { from, to };
  }

  return { from: openingFrom, to: closingTo };
};

export const replaceSelectionWithVariable = (selection, variableName) => {
  const { editor, editable, from, to, text } = selection || {};

  if (!editor || !editable || !from || !to) {
    return false;
  }

  if (editor.getRange(from, to) !== text) {
    return false;
  }

  const range = expandOverWrappingBraces(editor, from, to);
  editor.replaceRange(`{{${variableName}}}`, range.from, range.to);
  return true;
};
