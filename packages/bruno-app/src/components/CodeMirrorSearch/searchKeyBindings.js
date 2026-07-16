/**
 * Builds the CodeMirror extraKeys entries for the search/replace bar.
 *
 * Centralises the key handlers so they stay in sync across every CodeEditor
 * variant that embeds <CodeMirrorSearch />.
 *
 * @param {object} opts
 * @param {(update: object, cb?: () => void) => void} opts.setState
 * @param {{ current: object | null }} opts.searchBarRef
 * @param {() => boolean} opts.isSearchBarVisible
 * @param {boolean} opts.readOnly
 */
export function buildSearchKeyBindings({ setState, searchBarRef, isSearchBarVisible, readOnly }) {
  const openSearch = (cm) => {
    const selected = cm.getSelection();
    const cursor = cm.getCursor('from');
    setState({ searchBarVisible: true }, () => {
      if (selected) {
        searchBarRef.current?.setSearch(selected, cursor);
      } else {
        searchBarRef.current?.focusAtCursor(cursor);
      }
    });
  };

  const openReplace = readOnly
    ? false
    : () => {
        setState({ searchBarVisible: true }, () => {
          searchBarRef.current?.focus();
          searchBarRef.current?.openReplace();
        });
      };

  return {
    'Cmd-F': openSearch,
    'Ctrl-F': openSearch,
    'Cmd-H': openReplace,
    'Ctrl-H': openReplace,
    'Cmd-Alt-F': openReplace,
    'Ctrl-Alt-F': openReplace,
    'Esc': () => {
      if (isSearchBarVisible()) {
        searchBarRef.current?.close();
      }
    }
  };
}
