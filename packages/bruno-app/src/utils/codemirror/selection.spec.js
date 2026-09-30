import { getCodeMirrorSelectionPayload, replaceSelectionWithVariable } from './selection';

const pos = (line, ch) => ({ line, ch });

const createEditor = ({
  selection = 'token',
  selections = [{ anchor: pos(0, 4), head: pos(0, 9) }],
  readOnly = false,
  clickedChar = pos(0, 6),
  range = null
} = {}) => ({
  somethingSelected: () => !!selection,
  getSelection: () => selection,
  listSelections: () => selections,
  getOption: (name) => (name === 'readOnly' ? readOnly : undefined),
  coordsChar: () => clickedChar,
  getRange: jest.fn(() => (range === null ? selection : range)),
  replaceRange: jest.fn()
});

const event = { clientX: 10, clientY: 20 };

describe('getCodeMirrorSelectionPayload', () => {
  it('returns null when there is no editor', () => {
    expect(getCodeMirrorSelectionPayload(null, event)).toBeNull();
  });

  it('returns null when nothing is selected', () => {
    expect(getCodeMirrorSelectionPayload(createEditor({ selection: '' }), event)).toBeNull();
  });

  it('returns null for a whitespace-only selection', () => {
    expect(getCodeMirrorSelectionPayload(createEditor({ selection: '   \n  ' }), event)).toBeNull();
  });

  it('returns the selected text with its range', () => {
    const payload = getCodeMirrorSelectionPayload(createEditor(), event);

    expect(payload).toEqual({
      text: 'token',
      from: pos(0, 4),
      to: pos(0, 9),
      editable: true
    });
  });

  it('normalises a backwards drag so from precedes to', () => {
    const editor = createEditor({ selections: [{ anchor: pos(2, 9), head: pos(1, 4) }], clickedChar: pos(2, 0) });
    const payload = getCodeMirrorSelectionPayload(editor, event);

    expect(payload.from).toEqual(pos(1, 4));
    expect(payload.to).toEqual(pos(2, 9));
  });

  it('returns null when the right-click lands outside the selection', () => {
    const editor = createEditor({ clickedChar: pos(0, 30) });

    expect(getCodeMirrorSelectionPayload(editor, event)).toBeNull();
  });

  it('keeps the selection when the click is exactly on a boundary', () => {
    const editor = createEditor({ clickedChar: pos(0, 4) });

    expect(getCodeMirrorSelectionPayload(editor, event)).not.toBeNull();
  });

  it('reports editable false for a read-only editor', () => {
    expect(getCodeMirrorSelectionPayload(createEditor({ readOnly: true }), event).editable).toBe(false);
  });

  it('reports editable false for readOnly nocursor', () => {
    expect(getCodeMirrorSelectionPayload(createEditor({ readOnly: 'nocursor' }), event).editable).toBe(false);
  });

  it('skips the containment check when no event is supplied', () => {
    const editor = createEditor({ clickedChar: pos(0, 30) });

    expect(getCodeMirrorSelectionPayload(editor)).not.toBeNull();
  });
});

describe('replaceSelectionWithVariable', () => {
  const selectionFor = (editor, overrides = {}) => ({
    editor,
    editable: true,
    from: pos(0, 4),
    to: pos(0, 9),
    text: 'token',
    ...overrides
  });

  it('replaces the range when the document still matches', () => {
    const editor = createEditor();

    expect(replaceSelectionWithVariable(selectionFor(editor), 'apiKey')).toBe(true);
    expect(editor.replaceRange).toHaveBeenCalledWith('{{apiKey}}', pos(0, 4), pos(0, 9));
  });

  it('does not replace when the range no longer matches the captured text', () => {
    const editor = createEditor({ range: 'something else' });

    expect(replaceSelectionWithVariable(selectionFor(editor), 'apiKey')).toBe(false);
    expect(editor.replaceRange).not.toHaveBeenCalled();
  });

  it('does not replace on a read-only surface', () => {
    const editor = createEditor();

    expect(replaceSelectionWithVariable(selectionFor(editor, { editable: false }), 'apiKey')).toBe(false);
    expect(editor.replaceRange).not.toHaveBeenCalled();
  });

  it('does nothing for a dom selection that carries no editor', () => {
    expect(replaceSelectionWithVariable({ editor: null, editable: false }, 'apiKey')).toBe(false);
  });
});
