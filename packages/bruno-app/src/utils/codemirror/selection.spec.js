import { getCodeMirrorSelectionPayload, replaceSelectionWithVariable, resolveSelectionValue } from './selection';

const pos = (line, ch) => ({ line, ch });

const createEditor = ({
  selection = 'token',
  from = pos(0, 4),
  to = pos(0, 9),
  readOnly = false,
  clickedChar = pos(0, 6),
  range = null,
  document = null
} = {}) => ({
  somethingSelected: () => !!selection,
  getSelection: () => selection,
  getCursor: (which) => (which === 'from' ? from : to),
  getOption: (name) => (name === 'readOnly' ? readOnly : undefined),
  coordsChar: jest.fn(() => clickedChar),
  getRange: jest.fn((a, b) => {
    if (document !== null) {
      const line = document.split('\n')[a.line] ?? '';
      return line.slice(a.ch, b.ch);
    }
    return range === null ? selection : range;
  }),
  replaceRange: jest.fn(),
  getLine: jest.fn((line) => (document === null ? selection : document.split('\n')[line] ?? '')),
  getTokenAt: jest.fn((position) => {
    const text = document === null ? selection : document.split('\n')[position.line] ?? '';
    return tokenAt(text, position.ch);
  })
});

// Stands in for CodeMirror's javascript mode: the enclosing string literal, or a non-string token.
const tokenAt = (text, ch) => {
  const comment = text.indexOf('//');
  if (comment !== -1 && ch > comment) {
    return { type: 'comment', start: comment, end: text.length, string: text.slice(comment) };
  }

  const regex = text.match(/\/[^/\n]+\/[gimsuy]*/);
  if (regex && ch > regex.index && ch <= regex.index + regex[0].length) {
    return { type: 'string-2', start: regex.index, end: regex.index + regex[0].length, string: regex[0] };
  }

  let quote = null;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (!quote) {
      if (char === '\'' || char === '"' || char === '`') {
        quote = char;
        start = i;
      }
      continue;
    }

    if (quote === '`' && text.startsWith('${', i)) {
      const close = text.indexOf('}', i);
      if (close !== -1 && ch > i + 1 && ch <= close) {
        return { type: 'variable', start: i + 2, end: close, string: text.slice(i + 2, close) };
      }
      i = close === -1 ? i : close;
      continue;
    }

    if (char === quote) {
      if (ch >= start && ch <= i + 1) {
        return {
          type: quote === '`' ? 'string-2' : 'string',
          start,
          end: i + 1,
          string: text.slice(start, i + 1)
        };
      }
      quote = null;
      start = -1;
    }
  }

  return { type: null, start: 0, end: text.length, string: text };
};

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

  it('takes CodeMirror\'s normalised selection ends, so a backwards drag needs no handling', () => {
    const editor = createEditor({ from: pos(1, 4), to: pos(2, 9), clickedChar: pos(2, 0) });
    const payload = getCodeMirrorSelectionPayload(editor, event);

    expect(payload.from).toEqual(pos(1, 4));
    expect(payload.to).toEqual(pos(2, 9));
  });

  it('takes its text from the primary range, not every range of a multi-cursor selection', () => {
    // getSelection() would concatenate all ranges; the stored value must match the range we replace.
    const editor = createEditor({
      document: '{"a": "foo", "b": "foo"}',
      selection: 'foo\nfoo',
      from: pos(0, 7),
      to: pos(0, 10),
      clickedChar: pos(0, 8)
    });

    expect(getCodeMirrorSelectionPayload(editor, event).text).toBe('foo');
  });

  it('hit-tests the click in window coordinates, which is what clientX/clientY are', () => {
    const editor = createEditor();
    getCodeMirrorSelectionPayload(editor, event);

    expect(editor.coordsChar).toHaveBeenCalledWith({ left: 10, top: 20 }, 'window');
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

  it('replaces the whole reference when the selection sits inside existing braces', () => {
    const editor = createEditor({ document: '{{base_url}}/posts', selection: 'base_url' });
    const selection = selectionFor(editor, { from: pos(0, 2), to: pos(0, 10), text: 'base_url' });

    expect(replaceSelectionWithVariable(selection, 'host')).toBe(true);
    // Without swallowing the braces this would produce {{{{host}}}}.
    expect(editor.replaceRange).toHaveBeenCalledWith('{{host}}', pos(0, 0), pos(0, 12));
  });

  it('leaves a bare selection alone', () => {
    const editor = createEditor({ document: 'https://example.com', selection: 'https' });
    const selection = selectionFor(editor, { from: pos(0, 0), to: pos(0, 5), text: 'https' });

    expect(replaceSelectionWithVariable(selection, 'scheme')).toBe(true);
    expect(editor.replaceRange).toHaveBeenCalledWith('{{scheme}}', pos(0, 0), pos(0, 5));
  });

  it('does not swallow a lone closing brace pair', () => {
    const editor = createEditor({ document: 'value}}', selection: 'value' });
    const selection = selectionFor(editor, { from: pos(0, 0), to: pos(0, 5), text: 'value' });

    replaceSelectionWithVariable(selection, 'v');
    expect(editor.replaceRange).toHaveBeenCalledWith('{{v}}', pos(0, 0), pos(0, 5));
  });

  it('does nothing for a dom selection that carries no editor', () => {
    expect(replaceSelectionWithVariable({ editor: null, editable: false }, 'apiKey')).toBe(false);
  });
});

describe('replaceSelectionWithVariable in a script editor', () => {
  const scriptEditor = (document, from, to) =>
    createEditor({ document, from, to, selection: document.slice(from.ch, to.ch) });

  it.each([
    ['request', 'bru.getRequestVar'],
    ['folder', 'bru.getFolderVar'],
    ['collection', 'bru.getCollectionVar'],
    ['environment', 'bru.getEnvVar'],
    ['global', 'bru.getGlobalEnvVar']
  ])('emits the %s accessor instead of a template', (scopeType, accessor) => {
    const editor = scriptEditor('const t = abc123;', pos(0, 10), pos(0, 16));

    const selection = { editor, editable: true, from: pos(0, 10), to: pos(0, 16), text: 'abc123', mode: 'javascript' };

    expect(replaceSelectionWithVariable(selection, 'tok', scopeType)).toBe(true);
    expect(editor.replaceRange).toHaveBeenCalledWith(`${accessor}('tok')`, pos(0, 10), pos(0, 16));
  });

  it.each([['"'], ['\''], ['`']])('swallows a wrapping %s so the call is not a string literal', (quote) => {
    const document = `const t = ${quote}abc123${quote};`;
    const editor = scriptEditor(document, pos(0, 11), pos(0, 17));

    replaceSelectionWithVariable({ editor, editable: true, from: pos(0, 11), to: pos(0, 17), text: 'abc123', mode: 'javascript' }, 'tok', 'environment');

    expect(editor.replaceRange).toHaveBeenCalledWith('bru.getEnvVar(\'tok\')', pos(0, 10), pos(0, 18));
  });

  it('leaves an unquoted selection alone', () => {
    const editor = scriptEditor('const t = 5000;', pos(0, 10), pos(0, 14));

    replaceSelectionWithVariable({ editor, editable: true, from: pos(0, 10), to: pos(0, 14), text: '5000', mode: 'javascript' }, 'tok', 'environment');

    expect(editor.replaceRange).toHaveBeenCalledWith('bru.getEnvVar(\'tok\')', pos(0, 10), pos(0, 14));
  });

  it('still emits a template outside a script editor', () => {
    const editor = createEditor({ selection: 'abc123' });

    replaceSelectionWithVariable(
      { editor, editable: true, from: pos(0, 4), to: pos(0, 9), text: 'abc123', mode: 'text/plain' },
      'tok',
      'environment'
    );

    expect(editor.replaceRange).toHaveBeenCalledWith('{{tok}}', pos(0, 4), pos(0, 9));
  });

  it('falls back to a template for a scope with no accessor', () => {
    const editor = createEditor({ selection: 'abc123' });

    replaceSelectionWithVariable(
      { editor, editable: true, from: pos(0, 4), to: pos(0, 9), text: 'abc123', mode: 'javascript' },
      'tok',
      'runtime'
    );

    expect(editor.replaceRange).toHaveBeenCalledWith('{{tok}}', pos(0, 4), pos(0, 9));
  });
});

describe('replaceSelectionWithVariable inside a string literal', () => {
  const spliceResult = (line, word) => {
    const fromCh = line.indexOf(word);
    const toCh = fromCh + word.length;
    const editor = createEditor({ document: line, from: pos(0, fromCh), to: pos(0, toCh) });
    const selection = {
      editor,
      editable: true,
      from: pos(0, fromCh),
      to: pos(0, toCh),
      text: word,
      mode: 'javascript'
    };

    replaceSelectionWithVariable(selection, 'tok', 'request');

    const [text, a, b] = editor.replaceRange.mock.calls[0];
    return line.slice(0, a.ch) + text + line.slice(b.ch);
  };

  it('interpolates when the selection is at the end of the literal', () => {
    expect(spliceResult('const hello = \'help world\';', 'world')).toBe(
      'const hello = `help ${bru.getRequestVar(\'tok\')}`;'
    );
  });

  it('interpolates when the selection is at the start of the literal', () => {
    expect(spliceResult('const hello = \'help world\';', 'help')).toBe(
      'const hello = `${bru.getRequestVar(\'tok\')} world`;'
    );
  });

  it('interpolates in the middle, keeping both sides', () => {
    expect(spliceResult('const hello = \'help example world happy\';', 'world')).toBe(
      'const hello = `help example ${bru.getRequestVar(\'tok\')} happy`;'
    );
  });

  it('collapses to a bare call when the whole contents are selected', () => {
    expect(spliceResult('const hello = \'world\';', 'world')).toBe('const hello = bru.getRequestVar(\'tok\');');
  });

  it('leaves code outside any string untouched', () => {
    expect(spliceResult('const hello = 5000;', '5000')).toBe('const hello = bru.getRequestVar(\'tok\');');
  });

  it('ignores a quote that belongs to a different string', () => {
    expect(spliceResult('const a = \'x\'; const b = \'help world\';', 'world')).toBe(
      'const a = \'x\'; const b = `help ${bru.getRequestVar(\'tok\')}`;'
    );
  });

  it('splices into a literal that is already a template, leaving earlier variables intact', () => {
    expect(spliceResult('const hello = `help ${bru.getRequestVar(\'hola\')} world happy`;', 'world')).toBe(
      'const hello = `help ${bru.getRequestVar(\'hola\')} ${bru.getRequestVar(\'tok\')} happy`;'
    );
  });

  it('splices into a template when the selection is at its end', () => {
    expect(spliceResult('const hello = `help ${bru.getRequestVar(\'hola\')} world`;', 'world')).toBe(
      'const hello = `help ${bru.getRequestVar(\'hola\')} ${bru.getRequestVar(\'tok\')}`;'
    );
  });

  it('escapes a backtick already in the literal', () => {
    expect(spliceResult('const hello = \'a `tick` world\';', 'world')).toBe(
      'const hello = `a \\`tick\\` ${bru.getRequestVar(\'tok\')}`;'
    );
  });

  it('escapes an existing ${ so it is not interpolated', () => {
    expect(spliceResult('const hello = \'cost ${x} world\';', 'world')).toBe(
      'const hello = `cost \\${x} ${bru.getRequestVar(\'tok\')}`;'
    );
  });
});

describe('resolveSelectionValue', () => {
  const selectionIn = (line, word, mode) => {
    const fromCh = line.indexOf(word);
    const toCh = fromCh + word.length;
    return {
      editor: createEditor({ document: line, from: pos(0, fromCh), to: pos(0, toCh) }),
      editable: true,
      from: pos(0, fromCh),
      to: pos(0, toCh),
      text: word,
      mode
    };
  };

  it('stores the whole reference when the selection sits inside braces', () => {
    expect(resolveSelectionValue(selectionIn('{{baseUrl}}/posts', 'baseUrl'))).toBe('{{baseUrl}}');
  });

  it('stores the selection as-is when there are no wrapping braces', () => {
    expect(resolveSelectionValue(selectionIn('https://example.com/posts', 'example'))).toBe('example');
  });

  it('does not add braces that were already selected', () => {
    expect(resolveSelectionValue(selectionIn('{{baseUrl}}/posts', '{{baseUrl}}'))).toBe('{{baseUrl}}');
  });

  it('leaves quotes out of the value in a script', () => {
    expect(resolveSelectionValue(selectionIn('const a = \'help\';', 'help', 'javascript'))).toBe('help');
  });

  it('returns the text when there is no editor, as on a DOM selection', () => {
    expect(resolveSelectionValue({ text: 'plain', from: pos(0, 0), to: pos(0, 5) })).toBe('plain');
  });
});

describe('replaceSelectionWithVariable — cases the line scanner got wrong', () => {
  const rewrite = (line, word, lineIdx = 0) => {
    const lines = line.split('\n');
    const from = lines[lineIdx].indexOf(word);
    const editor = createEditor({
      document: line,
      from: pos(lineIdx, from),
      to: pos(lineIdx, from + word.length),
      selection: word
    });
    const replaced = replaceSelectionWithVariable(
      {
        editor,
        editable: true,
        from: pos(lineIdx, from),
        to: pos(lineIdx, from + word.length),
        text: word,
        mode: 'javascript'
      },
      'tok',
      'environment'
    );

    if (!replaced) return null;
    const [text, a, b] = editor.replaceRange.mock.calls[0];
    return lines[lineIdx].slice(0, a.ch) + text + lines[lineIdx].slice(b.ch);
  };

  it('does not nest an interpolation inside an existing one', () => {
    expect(rewrite('const a = `Bearer ${token}`;', 'token')).toBe(
      'const a = `Bearer ${bru.getEnvVar(\'tok\')}`;'
    );
  });

  it('is not fooled by an apostrophe in a comment', () => {
    expect(rewrite('const a = "help world"; // do not', 'world')).toBe(
      'const a = `help ${bru.getEnvVar(\'tok\')}`; // do not'
    );
  });

  it('declines to rewrite a literal holding an escape sequence rather than corrupt it', () => {
    expect(rewrite('const a = \'x\\`y world\';', 'world')).toBeNull();
  });

  it('does not treat a regex literal as a template', () => {
    expect(rewrite('const re = /hello world/;', 'world')).toBe('const re = /hello bru.getEnvVar(\'tok\')/;');
  });

  it('replaces plain code outside any literal', () => {
    expect(rewrite('const a = 5000;', '5000')).toBe('const a = bru.getEnvVar(\'tok\');');
  });
});
