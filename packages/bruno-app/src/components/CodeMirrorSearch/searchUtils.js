const MAX_MATCHES = 99_999;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds all matches in the editor for the given search parameters.
 *
 * @param {CodeMirror.Editor} editor
 * @param {string}  searchText
 * @param {boolean} regex
 * @param {boolean} caseSensitive
 * @param {boolean} wholeWord
 * @returns {Array<{ from: {line, ch}, to: {line, ch} }>}
 */
export function findSearchMatches(editor, searchText, regex, caseSensitive, wholeWord, limit = MAX_MATCHES) {
  try {
    let query, options = {};
    if (regex) {
      try {
        query = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
      } catch (error) {
        console.warn('Invalid regex provided in search!', error);
        return [];
      }
    } else if (wholeWord) {
      const escaped = escapeRegExp(searchText);
      query = new RegExp(`\\b${escaped}\\b`, caseSensitive ? 'g' : 'gi');
    } else {
      query = searchText;
      options = { caseFold: !caseSensitive };
    }

    const cursor = editor.getSearchCursor(query, { line: 0, ch: 0 }, options);
    const out = [];
    while (cursor.findNext()) {
      out.push({ from: cursor.from(), to: cursor.to() });
      if (out.length >= limit) break;
    }
    return out;
  } catch (e) {
    console.error('Search error:', e);
    return [];
  }
}

/**
 * Creates a cache key for the current search state.
 *
 * @param {number}  docVersion
 * @param {string}  searchText
 * @param {boolean} regex
 * @param {boolean} caseSensitive
 * @param {boolean} wholeWord
 * @returns {string}
 */
export function createCacheKey(docVersion, searchText, regex, caseSensitive, wholeWord) {
  return `${docVersion}⇴${searchText}⇴${regex}⇴${caseSensitive}⇴${wholeWord}`;
}
