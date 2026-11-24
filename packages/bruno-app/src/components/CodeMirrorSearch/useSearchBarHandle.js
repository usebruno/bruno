import { useImperativeHandle } from 'react';
import { findSearchMatches, createCacheKey, findMatchIndexAtOrAfter } from './searchUtils';

/**
 * Wires up the imperative API exposed via `ref` on <CodeMirrorSearch />.
 *
 * Extracted from the component body so the imperative surface stays in one place
 * and the main component file focuses on rendering and effects.
 */
export function useSearchBarHandle({
  ref,
  editor,
  searchText,
  regex,
  caseSensitive,
  wholeWord,
  searchMatches,
  searchCacheKey,
  docVersion,
  initialIndexRef,
  inputRef,
  replaceInputRef,
  setSearchText,
  setMatchCount,
  setMatchIndex,
  setReplaceVisible,
  doSearch,
  handleSearchBarClose
}) {
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },

    setSearch: (text, cursorPos) => {
      setSearchText(text);
      if (cursorPos && editor && text) {
        const matches = findSearchMatches(editor, text, regex, caseSensitive, wholeWord);
        const targetIdx = findMatchIndexAtOrAfter(matches, cursorPos);
        // Pre-populate cache so doSearch hits it regardless of path
        searchMatches.current = matches;
        searchCacheKey.current = createCacheKey(docVersion.current, text, regex, caseSensitive, wholeWord);
        // Set both count and index immediately to avoid flash before debounce fires
        setMatchCount(matches.length);
        setMatchIndex(targetIdx);
        doSearch(text, targetIdx, null, true);
        initialIndexRef.current = { idx: targetIdx, forText: text };
      } else {
        setMatchIndex(0);
      }
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    },

    focusAtCursor: (cursorPos) => {
      // If there's existing search text, navigate to nearest match at cursor
      if (cursorPos && editor && searchText) {
        const expectedKey = createCacheKey(docVersion.current, searchText, regex, caseSensitive, wholeWord);
        const matches = (expectedKey === searchCacheKey.current && searchMatches.current.length)
          ? searchMatches.current
          : findSearchMatches(editor, searchText, regex, caseSensitive, wholeWord);
        const resolvedIdx = findMatchIndexAtOrAfter(matches, cursorPos);
        searchMatches.current = matches;
        searchCacheKey.current = expectedKey;
        setMatchCount(matches.length);
        setMatchIndex(resolvedIdx);
        initialIndexRef.current = { idx: resolvedIdx, forText: searchText };
        doSearch(searchText, resolvedIdx);
      }
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    },

    openReplace: () => {
      setReplaceVisible(true);
      setTimeout(() => {
        replaceInputRef.current?.focus();
        replaceInputRef.current?.select();
      }, 0);
    },

    close: () => {
      handleSearchBarClose();
    }
  }));
}
