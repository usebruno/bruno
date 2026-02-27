import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { IconRegex, IconArrowUp, IconArrowDown, IconX, IconLetterCase, IconLetterW } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import useDebounce from 'hooks/useDebounce';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
}

const MAX_MATCHES = 99_999;
function findSearchMatches(editor, searchText, regex, caseSensitive, wholeWord) {
  try {
    let query;
    let caseFold = false;
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
      caseFold = !caseSensitive;
    }

    const cursor = editor.getSearchCursor(query, { line: 0, ch: 0 }, caseFold);
    const out = [];
    while (cursor.findNext()) {
      out.push({ from: cursor.from(), to: cursor.to() });
      if (out.length >= MAX_MATCHES) {
        break;
      }
    }
    return out;
  } catch (e) {
    console.error('Search error:', e);
    return [];
  }
}

function createCacheKey(editor, searchText, regex, caseSensitive, wholeWord) {
  return `${editor.getValue().length}⇴${searchText}⇴${regex}⇴${caseSensitive}⇴${wholeWord}`;
}

const CodeMirrorSearch = forwardRef(({ visible, editor, onClose }, ref) => {
  const [searchText, setSearchText] = useState('');
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  const searchMarks = useRef([]);
  const searchLineHighlight = useRef(null);
  const searchMatches = useRef([]);
  const searchCacheKey = useRef('');
  const inputRef = useRef(null);

  const debouncedSearchText = useDebounce(searchText, 250);
  const doSearch = useCallback((newIndex = 0) => {
    if (!editor || !visible) {
      return;
    }

    if (searchLineHighlight.current !== null) {
      editor.removeLineClass(searchLineHighlight.current, 'wrap', 'cm-search-line-highlight');
      searchLineHighlight.current = null;
    }

    if (!debouncedSearchText) {
      setMatchCount(0);
      setMatchIndex(0);
      searchMatches.current = [];
      searchMarks.current.forEach((mark) => mark.clear());
      searchMarks.current = [];
      return;
    }

    try {
      const newCacheKey = createCacheKey(editor, debouncedSearchText, regex, caseSensitive, wholeWord);
      const isCacheHit = newCacheKey === searchCacheKey.current;

      let matches = searchMatches.current;
      if (!isCacheHit) {
        matches = findSearchMatches(editor, debouncedSearchText, regex, caseSensitive, wholeWord);
        searchMatches.current = matches;
        searchCacheKey.current = newCacheKey;
        setMatchCount(matches.length);
      }

      if (!matches.length) {
        setMatchIndex(0);
        // Clear previous marks
        searchMarks.current.forEach((mark) => mark.clear());
        searchMarks.current = [];
        return;
      }

      const matchIndex = Math.max(0, Math.min(newIndex, matches.length - 1));
      setMatchIndex(matchIndex);

      if (isCacheHit) {
        // Clear only old current mark
        const oldIndex = searchMarks.current.findIndex((mark) => mark.className?.includes('cm-search-current'));

        if (oldIndex !== -1) {
          searchMarks.current[oldIndex].clear();
          searchMarks.current.splice(oldIndex, 1);
        }

        // Add mark to the new current and remark the previous and next
        const toMark = [
          // Previous
          matchIndex > 0 ? matchIndex - 1 : null,
          // Current
          matchIndex,
          // Next
          matchIndex < matches.length - 1 ? matchIndex + 1 : null
        ].filter((i) => i !== null);

        toMark.forEach((i) => {
          const mark = editor.markText(matches[i].from, matches[i].to, {
            className: i === matchIndex ? 'cm-search-current' : 'cm-search-match',
            clearOnEnter: true
          });
          searchMarks.current.push(mark);
        });
      } else {
        // Clear previous marks
        searchMarks.current.forEach((mark) => mark.clear());
        searchMarks.current = [];

        // Mark all on new search
        matches.forEach((m, i) => {
          const mark = editor.markText(m.from, m.to, {
            className: i === matchIndex ? 'cm-search-current' : 'cm-search-match',
            clearOnEnter: true
          });
          searchMarks.current.push(mark);
        });
      }

      const currentLine = matches[matchIndex].from.line;
      editor.addLineClass(currentLine, 'wrap', 'cm-search-line-highlight');
      searchLineHighlight.current = currentLine;

      editor.scrollIntoView(matches[matchIndex].from, 100);
      editor.setSelection(matches[matchIndex].from, matches[matchIndex].to);
    } catch (e) {
      console.error('Search error:', e);
      setMatchCount(0);
      setMatchIndex(0);
      searchMatches.current = [];
      searchCacheKey.current = '';
    }
  }, [debouncedSearchText, regex, caseSensitive, wholeWord, editor, visible]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }));

  useEffect(() => {
    doSearch(0);
  }, [debouncedSearchText, doSearch]);

  const handleSearchBarClose = useCallback(() => {
    searchMarks.current.forEach((mark) => mark.clear());
    searchMarks.current = [];
    if (searchLineHighlight.current !== null && editor) {
      editor.removeLineClass(searchLineHighlight.current, 'wrap', 'cm-search-line-highlight');
      searchLineHighlight.current = null;
    }
    searchMatches.current = [];
    searchCacheKey.current = '';
    if (onClose) onClose();
    // Focus the editor after closing the search bar
    if (editor) {
      setTimeout(() => editor.focus(), 0);
    }
  }, [editor, onClose]);

  const handleSearchTextChange = (text) => {
    setSearchText(text);
    setMatchIndex(0);
  };

  const handleToggleRegex = () => {
    setRegex((prev) => !prev);
    setMatchIndex(0);
  };

  const handleToggleCase = () => {
    setCaseSensitive((prev) => !prev);
    setMatchIndex(0);
  };

  const handleToggleWholeWord = () => {
    setWholeWord((prev) => !prev);
    setMatchIndex(0);
  };

  const handleNext = () => {
    if (!searchMatches.current || !searchMatches.current.length) return;
    const next = (matchIndex + 1) % searchMatches.current.length;
    doSearch(next);
  };

  const handlePrev = () => {
    if (!searchMatches.current || !searchMatches.current.length) return;
    const prev = (matchIndex - 1 + searchMatches.current.length) % searchMatches.current.length;
    doSearch(prev);
  };

  if (!visible) return null;

  return (
    <StyledWrapper>
      <div className="bruno-search-bar">
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={searchText}
          onChange={(e) => handleSearchTextChange(e.target.value)}
          placeholder="Search..."
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) handleNext();
            if (e.key === 'Enter' && e.shiftKey) handlePrev();
            if (e.key === 'Escape') handleSearchBarClose();
          }}
        />
        <span className="searchbar-result-count">{matchCount > 0 ? `${matchIndex + 1} / ${matchCount}` : '0 results'}</span>
        <ToolHint text="Regex search" toolhintId="searchbar-regex-toolhint" place="top">
          <button className={`searchbar-icon-btn ${regex ? 'active' : ''}`} onClick={handleToggleRegex}><IconRegex size={16} /></button>
        </ToolHint>
        <ToolHint text="Case sensitive" toolhintId="searchbar-case-toolhint" place="top">
          <button className={`searchbar-icon-btn ${caseSensitive ? 'active' : ''}`} onClick={handleToggleCase}><IconLetterCase size={14} /></button>
        </ToolHint>
        <ToolHint text="Whole word" toolhintId="searchbar-wholeword-toolhint" place="top">
          <button className={`searchbar-icon-btn ${wholeWord ? 'active' : ''}`} onClick={handleToggleWholeWord}><IconLetterW size={14} /></button>
        </ToolHint>
        <button className="searchbar-icon-btn" title="Previous" onClick={handlePrev}><IconArrowUp size={14} /></button>
        <button className="searchbar-icon-btn" title="Next" onClick={handleNext}><IconArrowDown size={14} /></button>
        <button className="searchbar-icon-btn" title="Close" onClick={handleSearchBarClose}><IconX size={14} /></button>
      </div>
    </StyledWrapper>
  );
});

export default CodeMirrorSearch;
