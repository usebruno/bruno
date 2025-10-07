import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { IconRegex, IconArrowUp, IconArrowDown, IconX, IconLetterCase, IconLetterW } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import useDebounce from 'hooks/useDebounce';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
}

const CustomSearch = ({ visible, editor, onClose }) => {
  const [searchText, setSearchText] = useState('');
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  const searchMarks = useRef([]);
  const searchLineHighlight = useRef(null);
  const searchMatches = useRef([]);

  const debouncedSearchText = useDebounce(searchText, 150);

  const memoizedMatches = useMemo(() => {
    if (!editor || !visible) return [];
    if (!debouncedSearchText) return [];

    try {
      let query, options = {};
      if (regex) {
        try {
          query = new RegExp(debouncedSearchText, caseSensitive ? 'g' : 'gi');
        } catch {
          return [];
        }
      } else if (wholeWord) {
        const escaped = escapeRegExp(debouncedSearchText);
        query = new RegExp(`\\b${escaped}\\b`, caseSensitive ? 'g' : 'gi');
      } else {
        query = debouncedSearchText;
        options = { caseFold: !caseSensitive };
      }

      const cursor = editor.getSearchCursor(query, { line: 0, ch: 0 }, options);
      const out = [];
      while (cursor.findNext()) {
        out.push({ from: cursor.from(), to: cursor.to() });
      }
      return out;
    } catch (e) {
      console.error('Search error:', e);
      return [];
    }
  }, [editor, visible, debouncedSearchText, regex, caseSensitive, wholeWord]);

  const doSearch = useCallback((newIndex = 0) => {
    if (!editor) return;

    // Clear previous marks
    searchMarks.current.forEach((mark) => mark.clear());
    searchMarks.current = [];
    // Clear previous line highlight
    if (searchLineHighlight.current !== null) {
      editor.removeLineClass(searchLineHighlight.current, 'wrap', 'cm-search-line-highlight');
      searchLineHighlight.current = null;
    }

    if (!debouncedSearchText) {
      setMatchCount(0);
      setMatchIndex(0);
      searchMatches.current = [];
      return;
    }

    try {
      const matches = memoizedMatches;
      let matchIndex = matches.length ? Math.max(0, Math.min(newIndex, matches.length - 1)) : 0;
      matches.forEach((m, i) => {
        const mark = editor.markText(m.from, m.to, {
          className: i === matchIndex ? 'cm-search-current' : 'cm-search-match',
          clearOnEnter: true
        });
        searchMarks.current.push(mark);
      });

      if (matches.length) {
        const currentLine = matches[matchIndex].from.line;
        editor.addLineClass(currentLine, 'wrap', 'cm-search-line-highlight');
        searchLineHighlight.current = currentLine;

        editor.scrollIntoView(matches[matchIndex].from, 100);
        editor.setSelection(matches[matchIndex].from, matches[matchIndex].to);
      } else {
        searchLineHighlight.current = null;
      }

      setMatchCount(matches.length);
      setMatchIndex(matchIndex);
      searchMatches.current = matches;
    } catch (e) {
      console.error('Search error:', e);
      setMatchCount(0);
      setMatchIndex(0);
      searchMatches.current = [];
    }
  }, [debouncedSearchText, regex, caseSensitive, wholeWord, editor, memoizedMatches]);

  useEffect(() => {
    doSearch(0, debouncedSearchText);
  }, [debouncedSearchText, doSearch]);

  const handleSearchBarClose = useCallback(() => {
    searchMarks.current.forEach((mark) => mark.clear());
    searchMarks.current = [];
    if (searchLineHighlight.current !== null && editor) {
      editor.removeLineClass(searchLineHighlight.current, 'wrap', 'cm-search-line-highlight');
      searchLineHighlight.current = null;
    }
    searchMatches.current = [];
    if (onClose) onClose();
    // Focus the editor after closing the search bar
    if (editor) {
      setTimeout(() => editor.focus(), 0);
    }
  }, [editor, onClose]);

  useEffect(() => {
    if (!visible || !editor) return;

    const handleKeyDown = (cm, event) => {
      if (event.key === 'Escape') {
        handleSearchBarClose();
      }
    };

    editor.on('keydown', handleKeyDown);

    return () => {
      editor.off('keydown', handleKeyDown);
    };
  }, [visible, editor, handleSearchBarClose]);

  const handleSearchTextChange = (text) => {
    setSearchText(text);
    setMatchIndex(0);
  };

  const handleToggleRegex = () => {
    setRegex((prev) => !prev);
    setMatchIndex(0);
    doSearch(0);
  };

  const handleToggleCase = () => {
    setCaseSensitive((prev) => !prev);
    setMatchIndex(0);
    doSearch(0);
  };

  const handleToggleWholeWord = () => {
    setWholeWord((prev) => !prev);
    setMatchIndex(0);
    doSearch(0);
  };

  const handleNext = () => {
    if (!searchMatches.current || !searchMatches.current.length) return;
    let next = (matchIndex + 1) % searchMatches.current.length;
    setMatchIndex(next);
    doSearch(next);
  };

  const handlePrev = () => {
    if (!searchMatches.current || !searchMatches.current.length) return;
    let prev = (matchIndex - 1 + searchMatches.current.length) % searchMatches.current.length;
    setMatchIndex(prev);
    doSearch(prev);
  };

  if (!visible) return null;

  return (
    <StyledWrapper>
      <div className="bruno-search-bar compact">
        <input
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
};

export default CustomSearch;
