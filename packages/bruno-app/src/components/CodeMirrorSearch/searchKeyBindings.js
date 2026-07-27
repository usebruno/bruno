/**
 * Builds the CodeMirror extraKeys entries for the search/replace bar.
 *
 * Centralises the key handlers so they stay in sync across every CodeEditor
 * variant that embeds <CodeMirrorSearch />.
 *
 * Search:  Cmd+F (Mac) / Ctrl+F (Win/Linux)
 * Replace: Cmd+Option+F (Mac) / Ctrl+H (Win/Linux)
 *
 * Note: Cmd+H is intentionally excluded — on macOS it is a system-level shortcut
 * that hides the application window and cannot be intercepted by Electron.
 *
 * @param {object} opts
 * @param {(update: object, cb?: () => void) => void} opts.setState
 * @param {{ current: object | null }} opts.searchBarRef
 * @param {() => boolean} opts.isSearchBarVisible
 * @param {() => boolean} opts.isReadOnly - read at invocation time so a readOnly prop change after mount is respected
 */
export function buildSearchKeyBindings({ setState, searchBarRef, isSearchBarVisible, isReadOnly }) {
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

  const openReplace = () => {
    if (isReadOnly()) return;
    setState({ searchBarVisible: true }, () => {
      searchBarRef.current?.focus();
      searchBarRef.current?.openReplace();
    });
  };

  return {
    'Cmd-F': openSearch,
    'Ctrl-F': openSearch,
    'Cmd-Alt-F': openReplace, // Cmd + Option + F — standard replace shortcut on Mac
    'Ctrl-H': openReplace, // Ctrl + H — standard replace shortcut on Windows/Linux
    'Cmd-H': false, // Mac: replace (our replace is Cmd+Option+F)
    'Esc': () => {
      if (isSearchBarVisible()) {
        searchBarRef.current?.close();
      }
    }
  };
}
