const comparePositions = (a, b) => (a.line - b.line) || (a.ch - b.ch);

const isPositionWithinRange = (position, from, to) =>
  comparePositions(position, from) >= 0 && comparePositions(position, to) <= 0;

export const getCodeMirrorSelectionPayload = (editor, event) => {
  if (!editor || typeof editor.somethingSelected !== 'function' || !editor.somethingSelected()) {
    return null;
  }

  const text = editor.getSelection();
  if (!text || !text.trim()) {
    return null;
  }

  const [range] = editor.listSelections() || [];
  if (!range) {
    return null;
  }

  const { anchor, head } = range;
  const reversed = comparePositions(anchor, head) > 0;
  const from = reversed ? head : anchor;
  const to = reversed ? anchor : head;

  if (event && typeof editor.coordsChar === 'function') {
    const clicked = editor.coordsChar({ left: event.clientX, top: event.clientY });
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

export const replaceSelectionWithVariable = (selection, variableName) => {
  const { editor, editable, from, to, text } = selection || {};

  if (!editor || !editable || !from || !to) {
    return false;
  }

  if (editor.getRange(from, to) !== text) {
    return false;
  }

  editor.replaceRange(`{{${variableName}}}`, from, to);
  return true;
};
