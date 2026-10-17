import { findSearchMatches, createCacheKey } from './searchUtils';

function makeMockEditor(matchResults = []) {
  return {
    getSearchCursor: jest.fn(() => {
      let i = -1;
      return {
        findNext: () => {
          i++; return i < matchResults.length;
        },
        from: () => matchResults[i]?.from,
        to: () => matchResults[i]?.to
      };
    })
  };
}

describe('findSearchMatches', () => {
  describe('literal search (default)', () => {
    it('passes caseFold:true for case-insensitive search', () => {
      const editor = makeMockEditor();
      findSearchMatches(editor, 'foo', false, false, false);
      expect(editor.getSearchCursor).toHaveBeenCalledWith('foo', { line: 0, ch: 0 }, { caseFold: true });
    });

    it('passes caseFold:false when caseSensitive is true', () => {
      const editor = makeMockEditor();
      findSearchMatches(editor, 'foo', false, true, false);
      expect(editor.getSearchCursor).toHaveBeenCalledWith('foo', { line: 0, ch: 0 }, { caseFold: false });
    });

    it('returns all matches from the editor cursor', () => {
      const matches = [
        { from: { line: 0, ch: 0 }, to: { line: 0, ch: 3 } },
        { from: { line: 1, ch: 5 }, to: { line: 1, ch: 8 } }
      ];
      const result = findSearchMatches(makeMockEditor(matches), 'foo', false, false, false);
      expect(result).toEqual(matches);
    });

    it('returns an empty array when there are no matches', () => {
      const result = findSearchMatches(makeMockEditor([]), 'foo', false, false, false);
      expect(result).toEqual([]);
    });
  });

  describe('whole-word search', () => {
    it('wraps the query in word-boundary regex', () => {
      const editor = makeMockEditor();
      findSearchMatches(editor, 'foo', false, false, true);
      const [query] = editor.getSearchCursor.mock.calls[0];
      expect(query).toBeInstanceOf(RegExp);
      expect(query.source).toBe('\\bfoo\\b');
    });

    it('is case-insensitive by default', () => {
      const editor = makeMockEditor();
      findSearchMatches(editor, 'foo', false, false, true);
      const [query] = editor.getSearchCursor.mock.calls[0];
      expect(query.flags).toContain('i');
    });

    it('is case-sensitive when caseSensitive=true', () => {
      const editor = makeMockEditor();
      findSearchMatches(editor, 'foo', false, true, true);
      const [query] = editor.getSearchCursor.mock.calls[0];
      expect(query.flags).not.toContain('i');
    });

    it('escapes special regex characters in the search term', () => {
      const editor = makeMockEditor();
      findSearchMatches(editor, 'foo.bar', false, false, true);
      const [query] = editor.getSearchCursor.mock.calls[0];
      expect(query.source).toBe('\\bfoo\\.bar\\b');
    });
  });

  describe('regex search', () => {
    it('builds a RegExp from the search text', () => {
      const editor = makeMockEditor();
      findSearchMatches(editor, 'Section \\d+', true, false, false);
      const [query] = editor.getSearchCursor.mock.calls[0];
      expect(query).toBeInstanceOf(RegExp);
      expect(query.source).toBe('Section \\d+');
    });

    it('is case-insensitive by default', () => {
      const editor = makeMockEditor();
      findSearchMatches(editor, 'foo', true, false, false);
      const [query] = editor.getSearchCursor.mock.calls[0];
      expect(query.flags).toContain('i');
    });

    it('is case-sensitive when caseSensitive=true', () => {
      const editor = makeMockEditor();
      findSearchMatches(editor, 'foo', true, true, false);
      const [query] = editor.getSearchCursor.mock.calls[0];
      expect(query.flags).not.toContain('i');
    });

    it('returns [] and skips getSearchCursor for an invalid regex', () => {
      const editor = makeMockEditor();
      const result = findSearchMatches(editor, '[invalid', true, false, false);
      expect(result).toEqual([]);
      expect(editor.getSearchCursor).not.toHaveBeenCalled();
    });
  });
});

describe('createCacheKey', () => {
  it('produces the same key for identical params', () => {
    expect(createCacheKey(1, 'foo', false, false, false))
      .toBe(createCacheKey(1, 'foo', false, false, false));
  });

  it('produces a different key when docVersion changes', () => {
    expect(createCacheKey(1, 'foo', false, false, false))
      .not.toBe(createCacheKey(2, 'foo', false, false, false));
  });

  it('produces a different key when searchText changes', () => {
    expect(createCacheKey(1, 'foo', false, false, false))
      .not.toBe(createCacheKey(1, 'bar', false, false, false));
  });

  it('produces a different key when regex flag changes', () => {
    expect(createCacheKey(1, 'foo', false, false, false))
      .not.toBe(createCacheKey(1, 'foo', true, false, false));
  });

  it('produces a different key when caseSensitive flag changes', () => {
    expect(createCacheKey(1, 'foo', false, false, false))
      .not.toBe(createCacheKey(1, 'foo', false, true, false));
  });

  it('produces a different key when wholeWord flag changes', () => {
    expect(createCacheKey(1, 'foo', false, false, false))
      .not.toBe(createCacheKey(1, 'foo', false, false, true));
  });
});
