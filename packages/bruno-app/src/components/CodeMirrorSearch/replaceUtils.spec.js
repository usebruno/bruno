import { replaceSingle, replaceAll } from './replaceUtils';

describe('replaceSingle', () => {
  function makeEditor() {
    return { replaceRange: jest.fn() };
  }

  it('calls replaceRange with the replacement text and match bounds', () => {
    const editor = makeEditor();
    const matches = [{ from: { line: 0, ch: 0 }, to: { line: 0, ch: 3 } }];
    replaceSingle(editor, matches, 0, 'bar');
    expect(editor.replaceRange).toHaveBeenCalledWith('bar', { line: 0, ch: 0 }, { line: 0, ch: 3 });
  });

  it('replaces the correct match when matchIndex > 0', () => {
    const editor = makeEditor();
    const matches = [
      { from: { line: 0, ch: 0 }, to: { line: 0, ch: 3 } },
      { from: { line: 1, ch: 4 }, to: { line: 1, ch: 7 } }
    ];
    replaceSingle(editor, matches, 1, 'qux');
    expect(editor.replaceRange).toHaveBeenCalledWith('qux', { line: 1, ch: 4 }, { line: 1, ch: 7 });
  });

  describe('endLine / endCh calculation', () => {
    it('single-line replacement: endCh = from.ch + replacement length', () => {
      const result = replaceSingle(makeEditor(), [{ from: { line: 0, ch: 4 }, to: { line: 0, ch: 7 } }], 0, 'hello');
      expect(result).toEqual({ endLine: 0, endCh: 9 });
    });

    it('empty string replacement (deletion): endCh = from.ch', () => {
      const result = replaceSingle(makeEditor(), [{ from: { line: 0, ch: 4 }, to: { line: 0, ch: 7 } }], 0, '');
      expect(result).toEqual({ endLine: 0, endCh: 4 });
    });

    it('multi-line replacement: endLine advances, endCh = last line length', () => {
      const result = replaceSingle(makeEditor(), [{ from: { line: 1, ch: 0 }, to: { line: 1, ch: 3 } }], 0, 'foo\nbar');
      expect(result).toEqual({ endLine: 2, endCh: 3 });
    });
  });
});

describe('replaceAll', () => {
  function makeEditor(text) {
    const lines = text.split('\n');
    return {
      getValue: jest.fn(() => text),
      lineCount: jest.fn(() => lines.length),
      lastLine: jest.fn(() => lines.length - 1),
      getLine: jest.fn((n) => lines[n]),
      replaceRange: jest.fn(),
      operation: jest.fn((fn) => fn())
    };
  }

  it('makes exactly one replaceRange call with the fully reconstructed text', () => {
    const editor = makeEditor('foo bar foo');
    const matches = [
      { from: { line: 0, ch: 0 }, to: { line: 0, ch: 3 } },
      { from: { line: 0, ch: 8 }, to: { line: 0, ch: 11 } }
    ];
    replaceAll(editor, matches, 'qux');
    expect(editor.operation).toHaveBeenCalled();
    expect(editor.replaceRange).toHaveBeenCalledTimes(1);
    expect(editor.replaceRange.mock.calls[0][0]).toBe('qux bar qux');
  });

  it('deletes matches when replacing with an empty string', () => {
    const editor = makeEditor('foo bar foo');
    const matches = [
      { from: { line: 0, ch: 0 }, to: { line: 0, ch: 3 } },
      { from: { line: 0, ch: 8 }, to: { line: 0, ch: 11 } }
    ];
    replaceAll(editor, matches, '');
    expect(editor.replaceRange.mock.calls[0][0]).toBe(' bar ');
  });

  it('handles replacements across multiple lines', () => {
    const editor = makeEditor('foo\nfoo');
    const matches = [
      { from: { line: 0, ch: 0 }, to: { line: 0, ch: 3 } },
      { from: { line: 1, ch: 0 }, to: { line: 1, ch: 3 } }
    ];
    replaceAll(editor, matches, 'bar');
    expect(editor.replaceRange.mock.calls[0][0]).toBe('bar\nbar');
  });

  it('replaces the range spanning the entire document', () => {
    const editor = makeEditor('foo bar');
    const matches = [{ from: { line: 0, ch: 0 }, to: { line: 0, ch: 3 } }];
    replaceAll(editor, matches, 'qux');
    const [, from, to] = editor.replaceRange.mock.calls[0];
    expect(from).toEqual({ line: 0, ch: 0 });
    expect(to).toEqual({ line: 0, ch: 7 });
  });
});
