import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { IconRegex, IconArrowUp, IconArrowDown, IconX, IconLetterCase, IconLetterW, IconChevronRight, IconReplace, IconArrowsExchange2 } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import useDebounce from 'hooks/useDebounce';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MAX_MATCHES = 99_999;
function findSearchMatches(editor, searchText, regex, caseSensitive, wholeWord) {
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
  const [replaceText, setReplaceText] = useState('');
  const [replaceVisible, setReplaceVisible] = useState(false);
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
  const replaceInputRef = useRef(null);
  const containerRef = useRef(null);
  const initialIndexRef = useRef(null);
  const visibleRef = useRef(visible);
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  const debouncedSearchText = useDebounce(searchText, 250);

  const doSearch = useCallback((newIndex = 0) => {
    if (!editor || !visibleRef.current) {
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
  }, [debouncedSearchText, regex, caseSensitive, wholeWord, editor]);

  const handleSearchBarClose = useCallback(() => {
    searchMarks.current.forEach((mark) => mark.clear());
    searchMarks.current = [];
    if (searchLineHighlight.current !== null && editor) {
      editor.removeLineClass(searchLineHighlight.current, 'wrap', 'cm-search-line-highlight');
      searchLineHighlight.current = null;
    }
    searchMatches.current = [];
    searchCacheKey.current = '';
    setReplaceVisible(false);
    if (onClose) onClose();
    // Focus the editor after closing the search bar
    if (editor) {
      setTimeout(() => editor.focus(), 0);
    }
  }, [editor, onClose]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    setSearch: (text, cursorPos) => {
      setSearchText(text);
      if (cursorPos && editor && text) {
        const matches = findSearchMatches(editor, text, regex, caseSensitive, wholeWord);
        const startsAtOrAfterCursor = (match) =>
          match.from.line > cursorPos.line
          || (match.from.line === cursorPos.line && match.from.ch >= cursorPos.ch);

        const matchAtCursorIdx = matches.findIndex(startsAtOrAfterCursor);
        const targetIdx = matchAtCursorIdx >= 0 ? matchAtCursorIdx : 0;
        // Pre-populate cache so doSearch hits it regardless of path
        searchMatches.current = matches;
        searchCacheKey.current = createCacheKey(editor, text, regex, caseSensitive, wholeWord);
        // Set both count and index immediately to avoid "1 / N" flash before debounce fires
        setMatchCount(matches.length);
        setMatchIndex(targetIdx);
        if (text === searchText) {
          // Same text — debouncedSearchText won't change, effect won't fire. Call directly.
          setTimeout(() => doSearch(targetIdx), 0);
        } else {
          // Text changed — effect will fire after debounce. Store text+index together
          // so the effect only consumes it when debouncedSearchText has caught up.
          initialIndexRef.current = { idx: targetIdx, forText: text };
        }
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
    openReplace: () => {
      setReplaceVisible(true);
      setTimeout(() => replaceInputRef.current?.focus(), 0);
    },
    close: () => {
      handleSearchBarClose();
    }
  }));

  useEffect(() => {
    if (initialIndexRef.current && initialIndexRef.current.forText === debouncedSearchText) {
      const idx = initialIndexRef.current.idx;
      initialIndexRef.current = null;
      doSearch(idx);
    } else {
      doSearch(0);
    }
  }, [debouncedSearchText, doSearch]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !visible) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSearchBarClose();
      }
    };

    container.addEventListener('keydown', onKeyDown, true);
    return () => container.removeEventListener('keydown', onKeyDown, true);
  }, [visible, handleSearchBarClose]);

  const handleSearchTextChange = (text) => {
    setSearchText(text);
    // setMatchIndex(0);
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

  const handleReplace = useCallback(() => {
    if (!editor || !searchMatches.current.length) return;
    const match = searchMatches.current[matchIndex];
    if (!match) return;
    editor.replaceRange(replaceText, match.from, match.to);

    const replaceLines = replaceText.split('\n');
    const endLine = match.from.line + replaceLines.length - 1;
    const endCh = replaceLines.length === 1
      ? match.from.ch + replaceText.length
      : replaceLines[replaceLines.length - 1].length;

    // Re-search and pre-populate the cache so doSearch uses these results directly
    const newMatches = findSearchMatches(editor, debouncedSearchText, regex, caseSensitive, wholeWord);
    searchMatches.current = newMatches;
    searchCacheKey.current = createCacheKey(editor, debouncedSearchText, regex, caseSensitive, wholeWord);
    setMatchCount(newMatches.length);

    // Find the first match that starts after the replacement end
    const nextIdx = newMatches.findIndex(
      (m) => m.from.line > endLine || (m.from.line === endLine && m.from.ch >= endCh)
    );

    doSearch(nextIdx >= 0 ? nextIdx : 0);
  }, [editor, matchIndex, replaceText, debouncedSearchText, regex, caseSensitive, wholeWord, doSearch]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || !searchMatches.current.length) return;
    const matches = [...searchMatches.current].reverse();
    editor.operation(() => {
      matches.forEach((match) => editor.replaceRange(replaceText, match.from, match.to));
    });
    searchCacheKey.current = '';
    doSearch(0);
  }, [editor, replaceText, doSearch]);

  const isDebouncing = searchText !== debouncedSearchText;

  if (!visible) return null;

  return (
    <StyledWrapper $replaceVisible={replaceVisible}>
      <div className="bruno-search-bar" ref={containerRef}>
        <button
          type="button"
          className="toggle-replace-btn"
          title={replaceVisible ? 'Hide replace' : 'Show replace'}
          onClick={() => setReplaceVisible((prev) => !prev)}
        >
          <IconChevronRight
            size={12}
            style={{ transform: replaceVisible ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
          />
        </button>
        <div className="search-replace-rows">
          <div className="search-row">
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
              }}
            />
            <span className="searchbar-result-count">{matchCount > 0 ? `${matchIndex + 1} / ${matchCount}` : '0 results'}</span>
            <ToolHint text="Regex search" toolhintId="searchbar-regex-toolhint" place="top">
              <button type="button" className={`searchbar-icon-btn ${regex ? 'active' : ''}`} onClick={handleToggleRegex}><IconRegex size={16} /></button>
            </ToolHint>
            <ToolHint text="Case sensitive" toolhintId="searchbar-case-toolhint" place="top">
              <button type="button" className={`searchbar-icon-btn ${caseSensitive ? 'active' : ''}`} onClick={handleToggleCase}><IconLetterCase size={14} /></button>
            </ToolHint>
            <ToolHint text="Whole word" toolhintId="searchbar-wholeword-toolhint" place="top">
              <button type="button" className={`searchbar-icon-btn ${wholeWord ? 'active' : ''}`} onClick={handleToggleWholeWord}><IconLetterW size={14} /></button>
            </ToolHint>
            <button type="button" className="searchbar-icon-btn" title="Previous (Shift+Enter)" onClick={handlePrev}><IconArrowUp size={14} /></button>
            <button type="button" className="searchbar-icon-btn" title="Next (Enter)" onClick={handleNext}><IconArrowDown size={14} /></button>
            <button type="button" className="searchbar-icon-btn" title="Close" onClick={handleSearchBarClose}><IconX size={14} /></button>
          </div>
          {replaceVisible && (
            <div className="replace-row">
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace..."
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isDebouncing) handleReplace();
                }}
              />
              <ToolHint text="Replace (Enter)" toolhintId="searchbar-replace-toolhint" place="top">
                <button type="button" aria-label="Replace" className="searchbar-icon-btn" disabled={isDebouncing} onClick={handleReplace}><IconReplace size={15} /></button>
              </ToolHint>
              <ToolHint text="Replace all" toolhintId="searchbar-replaceall-toolhint" place="top">
                <button type="button" aria-label="Replace all" className="searchbar-icon-btn" disabled={isDebouncing} onClick={handleReplaceAll}><IconArrowsExchange2 size={15} /></button>
              </ToolHint>
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
});

export default CodeMirrorSearch;
