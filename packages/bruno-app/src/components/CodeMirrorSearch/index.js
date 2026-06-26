import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { IconRegex, IconArrowUp, IconArrowDown, IconX, IconLetterCase, IconLetterW, IconChevronRight, IconReplace, IconArrowsExchange2 } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import useDebounce from 'hooks/useDebounce';
import { replaceSingle, replaceAll } from './replaceUtils';
import { findSearchMatches, createCacheKey } from './searchUtils';
import { markViewportMatches, clearMarks } from './markingUtils';

const CodeMirrorSearch = forwardRef(({ visible, editor, readOnly, onClose }, ref) => {
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
  const currentMatchIndex = useRef(0);
  const docVersion = useRef(0);
  const inputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const containerRef = useRef(null);
  const initialIndexRef = useRef(null);
  const rafRef = useRef(null);

  const debouncedSearchText = useDebounce(searchText, 250);

  const redrawMarks = useCallback(() => {
    if (!editor) return;
    markViewportMatches(editor, searchMatches.current, currentMatchIndex.current, searchMarks.current);
  }, [editor]);

  const doSearch = useCallback((text, newIndex = 0) => {
    if (!editor || !visible) {
      return;
    }

    if (searchLineHighlight.current !== null) {
      editor.removeLineClass(searchLineHighlight.current, 'wrap', 'cm-search-line-highlight');
      searchLineHighlight.current = null;
    }

    if (!text) {
      setMatchCount(0);
      setMatchIndex(0);
      currentMatchIndex.current = 0;
      searchMatches.current = [];
      clearMarks(searchMarks.current);
      return;
    }

    try {
      const newCacheKey = createCacheKey(docVersion.current, text, regex, caseSensitive, wholeWord);
      const isCacheHit = newCacheKey === searchCacheKey.current;

      let matches = searchMatches.current;
      if (!isCacheHit) {
        matches = findSearchMatches(editor, text, regex, caseSensitive, wholeWord);
        searchMatches.current = matches;
        searchCacheKey.current = newCacheKey;
        setMatchCount(matches.length);
      }

      if (!matches.length) {
        setMatchIndex(0);
        currentMatchIndex.current = 0;
        clearMarks(searchMarks.current);
        return;
      }

      const resolvedIndex = Math.max(0, Math.min(newIndex, matches.length - 1));
      setMatchIndex(resolvedIndex);
      currentMatchIndex.current = resolvedIndex;

      redrawMarks();

      const currentLine = matches[resolvedIndex].from.line;
      editor.addLineClass(currentLine, 'wrap', 'cm-search-line-highlight');
      searchLineHighlight.current = currentLine;

      editor.scrollIntoView(matches[resolvedIndex].from, 100);
      editor.setSelection(matches[resolvedIndex].from, matches[resolvedIndex].to);
    } catch (e) {
      console.error('Search error:', e);
      setMatchCount(0);
      setMatchIndex(0);
      currentMatchIndex.current = 0;
      searchMatches.current = [];
      searchCacheKey.current = '';
    }
  }, [regex, caseSensitive, wholeWord, editor, visible, redrawMarks]);

  const handleSearchBarClose = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    clearMarks(searchMarks.current);
    if (searchLineHighlight.current !== null && editor) {
      editor.removeLineClass(searchLineHighlight.current, 'wrap', 'cm-search-line-highlight');
      searchLineHighlight.current = null;
    }
    searchMatches.current = [];
    searchCacheKey.current = '';
    currentMatchIndex.current = 0;
    setReplaceVisible(false);
    if (onClose) onClose();
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
        searchCacheKey.current = createCacheKey(docVersion.current, text, regex, caseSensitive, wholeWord);
        // Set both count and index immediately to avoid "1 / N" flash before debounce fires
        setMatchCount(matches.length);
        setMatchIndex(targetIdx);
        doSearch(text, targetIdx);
        if (text !== searchText) {
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
    if (initialIndexRef.current) {
      if (initialIndexRef.current.forText === debouncedSearchText) {
        const idx = initialIndexRef.current.idx;
        initialIndexRef.current = null;
        doSearch(debouncedSearchText, idx);
      }
    } else {
      doSearch(debouncedSearchText, 0);
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

  useEffect(() => {
    if (!editor || !visible) return;

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        redrawMarks();
      });
    };

    editor.on('scroll', handleScroll);
    return () => {
      editor.off('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [editor, visible, redrawMarks]);

  useEffect(() => {
    if (!editor || !visible) return;

    let timeoutId;
    const handleChange = () => {
      docVersion.current += 1;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        searchCacheKey.current = '';
        doSearch(debouncedSearchText, 0);
      }, 100);
    };

    editor.on('change', handleChange);
    return () => {
      editor.off('change', handleChange);
      clearTimeout(timeoutId);
    };
  }, [editor, visible, doSearch, debouncedSearchText]);

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
    doSearch(debouncedSearchText, next);
  };

  const handlePrev = () => {
    if (!searchMatches.current || !searchMatches.current.length) return;
    const prev = (matchIndex - 1 + searchMatches.current.length) % searchMatches.current.length;
    doSearch(debouncedSearchText, prev);
  };

  const handleReplace = useCallback(() => {
    if (!editor || !searchMatches.current.length) return;
    if (!searchMatches.current[matchIndex]) return;

    const { endLine, endCh } = replaceSingle(editor, searchMatches.current, matchIndex, replaceText);

    const newMatches = findSearchMatches(editor, debouncedSearchText, regex, caseSensitive, wholeWord);
    searchMatches.current = newMatches;
    searchCacheKey.current = createCacheKey(docVersion.current, debouncedSearchText, regex, caseSensitive, wholeWord);
    setMatchCount(newMatches.length);

    const nextIdx = newMatches.findIndex(
      (m) => m.from.line > endLine || (m.from.line === endLine && m.from.ch >= endCh)
    );
    doSearch(debouncedSearchText, nextIdx >= 0 ? nextIdx : 0);
  }, [editor, matchIndex, replaceText, debouncedSearchText, regex, caseSensitive, wholeWord, doSearch]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || !searchMatches.current.length) return;

    replaceAll(editor, searchMatches.current, replaceText);

    searchCacheKey.current = '';
    doSearch(debouncedSearchText, 0);
  }, [editor, replaceText, debouncedSearchText, doSearch]);

  const isDebouncing = searchText !== debouncedSearchText;
  const isReplaceDisabled = isDebouncing || !searchText.trim() || matchCount === 0;

  if (!visible) return null;

  return (
    <StyledWrapper $replaceVisible={replaceVisible}>
      <div className="bruno-search-bar" ref={containerRef}>
        <button
          type="button"
          className={`toggle-replace-btn${replaceVisible ? ' active' : ''}`}
          title={replaceVisible ? 'Hide replace' : 'Show replace'}
          onClick={() => setReplaceVisible((prev) => !prev)}
          style={readOnly ? { display: 'none' } : {}}
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
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && replaceVisible && !isReplaceDisabled) {
                  e.preventDefault();
                  handleReplaceAll();
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  handleNext();
                } else if (e.key === 'Enter' && e.shiftKey) {
                  handlePrev();
                }
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
          {replaceVisible && !readOnly && (
            <div className="replace-row">
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace..."
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isReplaceDisabled) {
                    e.preventDefault();
                    handleReplaceAll();
                  } else if (e.key === 'Enter' && !isReplaceDisabled) {
                    handleReplace();
                  }
                }}
              />
              <ToolHint text="Replace" toolhintId="searchbar-replace-toolhint" place="top">
                <button type="button" aria-label="Replace" className="searchbar-icon-btn" disabled={isReplaceDisabled} onClick={handleReplace}><IconReplace size={15} /></button>
              </ToolHint>
              <ToolHint text="Replace all" toolhintId="searchbar-replaceall-toolhint" place="top">
                <button type="button" aria-label="Replace all" className="searchbar-icon-btn" disabled={isReplaceDisabled} onClick={handleReplaceAll}><IconArrowsExchange2 size={15} /></button>
              </ToolHint>
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
});

export default CodeMirrorSearch;
