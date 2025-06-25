import React, { useState, useEffect, useRef, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { IconRegex, IconArrowUp, IconArrowDown, IconX, IconLetterCase, IconLetterW } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
}

const CustomSearch = ({ visible, editor, onClose }) => {
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  const searchMarks = useRef([]);
  const searchLineHighlight = useRef(null);
  const searchMatches = useRef([]);

  const doSearch = useCallback(debounce((newIndex = 0) => {
    if (!editor) return;

    // Clear previous marks
    searchMarks.current.forEach(mark => mark.clear());
    searchMarks.current = [];
    // Clear previous line highlight
    if (searchLineHighlight.current !== null) {
      editor.removeLineClass(searchLineHighlight.current, 'wrap', 'cm-search-line-highlight');
      searchLineHighlight.current = null;
    }

    if (!searchText) {
      setMatchCount(0);
      setMatchIndex(0);
      searchMatches.current = [];
      return;
    }

    try {
      let query, options = {};
      if (regex) {
        try {
          query = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
        } catch (e) {
          setMatchCount(0);
          setMatchIndex(0);
          searchMatches.current = [];
          return;
        }
      } else if (wholeWord) {
        const escaped = escapeRegExp(searchText);
        query = new RegExp(`\\b${escaped}\\b`, caseSensitive ? 'g' : 'gi');
      } else {
        query = searchText;
        options = { caseFold: !caseSensitive };
      }

      const cursor = editor.getSearchCursor(query, { line: 0, ch: 0 }, options);
      let matches = [];
      while (cursor.findNext()) {
        matches.push({ from: cursor.from(), to: cursor.to() });
      }

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
      } else {
        searchLineHighlight.current = null;
      }

      setMatchCount(matches.length);
      setMatchIndex(matchIndex);
      if (matches.length) {
        editor.scrollIntoView(matches[matchIndex].from, 100);
        editor.setSelection(matches[matchIndex].from, matches[matchIndex].to);
      }
      searchMatches.current = matches;
    } catch (e) {
      console.error('Search error:', e);
      setMatchCount(0);
      setMatchIndex(0);
      searchMatches.current = [];
    }
  }, 150), [searchText, regex, caseSensitive, wholeWord, editor]);

  useEffect(() => {
    if (visible) setSearchBarVisible(true);
  }, [visible]);

  const handleSearchBarClose = useCallback(() => {
    setSearchBarVisible(false);
    searchMarks.current.forEach(mark => mark.clear());
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

  const handleSearchTextChange = useCallback((text) => {
    setSearchText(text);
    setMatchIndex(0);
    doSearch(0);
  }, [doSearch]);

  const handleToggleRegex = useCallback(() => {
    setRegex(prev => !prev);
    setMatchIndex(0);
    doSearch(0);
  }, [doSearch]);

  const handleToggleCase = useCallback(() => {
    setCaseSensitive(prev => !prev);
    setMatchIndex(0);
    doSearch(0);
  }, [doSearch]);

  const handleToggleWholeWord = useCallback(() => {
    setWholeWord(prev => !prev);
    setMatchIndex(0);
    doSearch(0);
  }, [doSearch]);

  const handleNext = useCallback(() => {
    if (!searchMatches.current || !searchMatches.current.length) return;
    let next = (matchIndex + 1) % searchMatches.current.length;
    setMatchIndex(next);
    doSearch(next);
  }, [matchIndex, doSearch]);

  const handlePrev = useCallback(() => {
    if (!searchMatches.current || !searchMatches.current.length) return;
    let prev = (matchIndex - 1 + searchMatches.current.length) % searchMatches.current.length;
    setMatchIndex(prev);
    doSearch(prev);
  }, [matchIndex, doSearch]);

  // Effect to trigger search when search options change
  useEffect(() => {
    if (searchText) {
      doSearch(0);
    }
  }, [regex, caseSensitive, wholeWord, doSearch, searchText, searchBarVisible]);

  if (!searchBarVisible) return null;
  return (
    <StyledWrapper>
      <div className="bruno-search-bar compact">
        <input
          autoFocus
          type="text"
          value={searchText}
          onChange={e => handleSearchTextChange(e.target.value)}
          placeholder="Search..."
          spellCheck={false}
          onKeyDown={e => {
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