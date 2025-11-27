import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IconRegex, IconArrowUp, IconArrowDown, IconX, IconLetterCase, IconLetterW } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import useDebounce from 'hooks/useDebounce';

/**
 * Escapes special regex characters in a string so it can be used as a literal in a regex pattern.
 * @param {string} string - The string to escape
 * @returns {string} The escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
}

/**
 * Builds a query (RegExp or string) for CodeMirror's getSearchCursor based on search options.
 *
 * @param {string} searchText - The text to search for
 * @param {boolean} regex - Whether to treat searchText as a regex pattern
 * @param {boolean} caseSensitive - Whether the search should be case-sensitive
 * @param {boolean} wholeWord - Whether to match whole words only
 * @returns {{ query: RegExp|string, error: string|null }} Object containing the query and any error message
 *
 * @description
 * Three search types are supported:
 * 1. Regex Mode: User input is treated as a regex pattern. Invalid patterns return an error.
 * 2. Whole Word Mode: Escapes special chars and wraps with word boundaries (\b...\b)
 * 3. Plain Text Mode:
 *    - Case-sensitive: Pass string directly to getSearchCursor
 *    - Case-insensitive: Convert to RegExp with 'gi' flag (fixes caseFold API issue)
 */
function buildQuery(searchText, regex, caseSensitive, wholeWord) {
  if (regex) {
    try {
      const query = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
      return { query, error: null };
    } catch (error) {
      return { query: null, error: error.message || 'Invalid regex pattern' };
    }
  } else if (wholeWord) {
    const escaped = escapeRegExp(searchText);
    const query = new RegExp(`\\b${escaped}\\b`, caseSensitive ? 'g' : 'gi');
    return { query, error: null };
  } else {
    // Plain text mode
    if (caseSensitive) {
      // Case-sensitive: pass string directly
      return { query: searchText, error: null };
    } else {
      // Case-insensitive: use RegExp with 'gi' flag (more reliable than caseFold option)
      const escaped = escapeRegExp(searchText);
      const query = new RegExp(escaped, 'gi');
      return { query, error: null };
    }
  }
}

/**
 * Search chunk data structure containing complete match information.
 * @typedef {Object} SearchChunk
 * @property {{ line: number, ch: number }} from - Start position of the match
 * @property {{ line: number, ch: number }} to - End position of the match
 * @property {number} line - Line number (convenience property, same as from.line)
 * @property {string} text - The matched text content
 * @property {number} index - Index in the chunks array
 */

/**
 * Finds all search matches in the editor and returns them as chunks.
 * Uses CodeMirror's getSearchCursor API to find matches.
 *
 * @param {Object} editor - CodeMirror editor instance
 * @param {string} searchText - The text to search for
 * @param {boolean} regex - Whether to treat searchText as a regex pattern
 * @param {boolean} caseSensitive - Whether the search should be case-sensitive
 * @param {boolean} wholeWord - Whether to match whole words only
 * @returns {{ chunks: SearchChunk[], error: string|null }} Object containing chunks array and any error
 */
function findAllChunks(editor, searchText, regex, caseSensitive, wholeWord) {
  if (!editor || !searchText) {
    return { chunks: [], error: null };
  }

  const { query, error } = buildQuery(searchText, regex, caseSensitive, wholeWord);
  if (error) {
    return { chunks: [], error };
  }
  if (!query) {
    return { chunks: [], error: null };
  }
  try {
    const doc = editor.getDoc ? editor.getDoc() : editor;
    if (!doc || !doc.getSearchCursor) {
      return { chunks: [], error: 'Editor is not properly initialized' };
    }

    const cursor = doc.getSearchCursor(query, { line: 0, ch: 0 });
    if (!cursor) {
      return { chunks: [], error: 'Failed to create search cursor' };
    }

    const chunks = [];
    let index = 0;
    while (cursor.findNext()) {
      try {
        const from = cursor.from();
        const to = cursor.to();
        const matchedText = editor.getRange ? editor.getRange(from, to) : doc.getRange(from, to);
        chunks.push({
          from,
          to,
          line: from.line,
          text: matchedText,
          index: index++
        });
      } catch (chunkError) {
        // Skip this chunk if there's an error reading it
        continue;
      }
    }
    return { chunks, error: null };
  } catch (e) {
    console.error('Search error:', e);
    return { chunks: [], error: e.message || 'Search error occurred' };
  }
}

/**
 * Clears all search highlights from the editor.
 *
 * @param {Object} editor - CodeMirror editor instance
 * @param {Array} marks - Array of mark objects to clear
 * @param {number|null} lineHighlight - Line number with highlight class, or null
 */
function clearHighlights(editor, marks, lineHighlight) {
  if (!editor) return;

  // Clear text marks
  marks.forEach((mark) => mark.clear());

  // Clear line highlight
  if (lineHighlight !== null) {
    editor.removeLineClass(lineHighlight, 'wrap', 'cm-search-line-highlight');
  }
}

/**
 * Applies search highlights to the editor for all chunks, with the current chunk highlighted differently.
 *
 * @param {Object} editor - CodeMirror editor instance
 * @param {SearchChunk[]} chunks - Array of search chunks to highlight
 * @param {number} currentIndex - Index of the currently selected chunk
 * @returns {{ marks: Array, lineHighlight: number|null }} Object containing marks array and line highlight number
 */
function applyHighlights(editor, chunks, currentIndex) {
  if (!editor || !chunks || chunks.length === 0) {
    return { marks: [], lineHighlight: null };
  }

  const marks = [];
  const validIndex = Math.max(0, Math.min(currentIndex, chunks.length - 1));
  const currentChunk = chunks[validIndex];

  // Apply marks to all chunks
  chunks.forEach((chunk, i) => {
    const mark = editor.markText(chunk.from, chunk.to, {
      className: i === validIndex ? 'cm-search-current' : 'cm-search-match',
      clearOnEnter: true
    });
    marks.push(mark);
  });

  // Highlight the line containing the current chunk
  const lineHighlight = currentChunk.line;
  editor.addLineClass(lineHighlight, 'wrap', 'cm-search-line-highlight');

  // Scroll to and select the current chunk
  editor.scrollIntoView(currentChunk.from, 100);
  editor.setSelection(currentChunk.from, currentChunk.to);

  return { marks, lineHighlight };
}

/**
 * Moves to the next chunk, wrapping around to the first chunk if at the end.
 *
 * @param {SearchChunk[]} chunks - Array of search chunks
 * @param {number} currentIndex - Current chunk index
 * @returns {number} New chunk index
 */
function goToNext(chunks, currentIndex) {
  if (!chunks || chunks.length === 0) return -1;
  return (currentIndex + 1) % chunks.length;
}

/**
 * Moves to the previous chunk, wrapping around to the last chunk if at the beginning.
 *
 * @param {SearchChunk[]} chunks - Array of search chunks
 * @param {number} currentIndex - Current chunk index
 * @returns {number} New chunk index
 */
function goToPrevious(chunks, currentIndex) {
  if (!chunks || chunks.length === 0) return -1;
  return (currentIndex - 1 + chunks.length) % chunks.length;
}

const CodeMirrorSearch = ({ visible, editor, onClose }) => {
  // State
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, 150);
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(-1);
  const [regexError, setRegexError] = useState(null);

  // Refs for managing editor marks and highlights
  const searchMarks = useRef([]);
  const searchLineHighlight = useRef(null);

  /**
   * Performs search and updates chunks when search parameters change.
   * Automatically navigates to the first match if matches are found.
   */
  useEffect(() => {
    try {
      if (!editor || !visible) {
        // Clear highlights when editor is not available or search is not visible
        clearHighlights(editor, searchMarks.current, searchLineHighlight.current);
        searchMarks.current = [];
        searchLineHighlight.current = null;
        setChunks([]);
        setCurrentChunkIndex(-1);
        setRegexError(null);
        return;
      }

      if (!debouncedSearchText) {
        // Clear highlights when search text is empty
        clearHighlights(editor, searchMarks.current, searchLineHighlight.current);
        searchMarks.current = [];
        searchLineHighlight.current = null;
        setChunks([]);
        setCurrentChunkIndex(-1);
        setRegexError(null);
        return;
      }

      // Perform search
      const { chunks: newChunks, error } = findAllChunks(editor, debouncedSearchText, regex, caseSensitive, wholeWord);

      // Always clear previous highlights first
      clearHighlights(editor, searchMarks.current, searchLineHighlight.current);
      searchMarks.current = [];
      searchLineHighlight.current = null;

      // If there's an error (e.g., invalid regex), clear everything and show error
      if (error) {
        setChunks([]);
        setCurrentChunkIndex(-1);
        setRegexError(error);
        return;
      }

      // Update state with search results
      setChunks(newChunks);
      setRegexError(null);

      // Apply highlights and navigate to first match only if we have results
      if (newChunks.length > 0) {
        const { marks, lineHighlight } = applyHighlights(editor, newChunks, 0);
        searchMarks.current = marks;
        searchLineHighlight.current = lineHighlight;
        setCurrentChunkIndex(0);
      } else {
        setCurrentChunkIndex(-1);
      }
    } catch (e) {
      // Catch any unexpected errors to prevent app crash
      console.error('Unexpected error in search:', e);
      // Clear everything on error
      try {
        clearHighlights(editor, searchMarks.current, searchLineHighlight.current);
      } catch (clearError) {
        console.error('Error clearing highlights:', clearError);
      }
      searchMarks.current = [];
      searchLineHighlight.current = null;
      setChunks([]);
      setCurrentChunkIndex(-1);
      setRegexError(e.message || 'An unexpected error occurred during search');
    }
  }, [editor, visible, debouncedSearchText, regex, caseSensitive, wholeWord]);

  /**
   * Updates highlights when currentChunkIndex changes (e.g., via navigation).
   */
  useEffect(() => {
    if (!editor || !visible || chunks.length === 0 || currentChunkIndex < 0) {
      return;
    }

    // Clear previous highlights
    clearHighlights(editor, searchMarks.current, searchLineHighlight.current);
    searchMarks.current = [];
    searchLineHighlight.current = null;

    // Apply new highlights for current chunk
    const { marks, lineHighlight } = applyHighlights(editor, chunks, currentChunkIndex);
    searchMarks.current = marks;
    searchLineHighlight.current = lineHighlight;
  }, [currentChunkIndex, editor, visible, chunks]);

  /**
   * Handles closing the search bar and cleaning up.
   */
  const handleSearchBarClose = useCallback(() => {
    clearHighlights(editor, searchMarks.current, searchLineHighlight.current);
    searchMarks.current = [];
    searchLineHighlight.current = null;
    setChunks([]);
    setCurrentChunkIndex(-1);
    setRegexError(null);

    if (onClose) onClose();

    // Focus the editor after closing the search bar
    if (editor) {
      setTimeout(() => editor.focus(), 0);
    }
  }, [editor, onClose]);

  /**
   * Handles search text input changes.
   */
  const handleSearchTextChange = (text) => {
    setSearchText(text);
    setCurrentChunkIndex(-1);
  };

  /**
   * Handles toggling regex mode.
   */
  const handleToggleRegex = () => {
    setRegex((prev) => !prev);
    setCurrentChunkIndex(-1);
    // Error will be cleared when regex mode is disabled
    if (regex) {
      setRegexError(null);
    }
  };

  /**
   * Handles toggling case sensitivity.
   */
  const handleToggleCase = () => {
    setCaseSensitive((prev) => !prev);
    setCurrentChunkIndex(-1);
  };

  /**
   * Handles toggling whole word mode.
   */
  const handleToggleWholeWord = () => {
    setWholeWord((prev) => !prev);
    setCurrentChunkIndex(-1);
  };

  /**
   * Handles navigating to the next chunk.
   */
  const handleNext = () => {
    if (chunks.length === 0) return;
    const nextIndex = goToNext(chunks, currentChunkIndex);
    setCurrentChunkIndex(nextIndex);
  };

  /**
   * Handles navigating to the previous chunk.
   */
  const handlePrev = () => {
    if (chunks.length === 0) return;
    const prevIndex = goToPrevious(chunks, currentChunkIndex);
    setCurrentChunkIndex(prevIndex);
  };

  if (!visible) return null;

  const matchCount = chunks.length;
  const displayIndex = currentChunkIndex >= 0 ? currentChunkIndex + 1 : 0;

  return (
    <StyledWrapper>
      <div className="bruno-search-bar compact">
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}>
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
              style={{ flex: 1, minWidth: 0 }}
            />
            <span className="searchbar-result-count">
              {matchCount > 0 ? `${displayIndex} / ${matchCount}` : '0 results'}
            </span>
            <ToolHint text="Regex search" toolhintId="searchbar-regex-toolhint" place="top">
              <button className={`searchbar-icon-btn ${regex ? 'active' : ''}`} onClick={handleToggleRegex}>
                <IconRegex size={16} />
              </button>
            </ToolHint>
            <ToolHint text="Case sensitive" toolhintId="searchbar-case-toolhint" place="top">
              <button className={`searchbar-icon-btn ${caseSensitive ? 'active' : ''}`} onClick={handleToggleCase}>
                <IconLetterCase size={14} />
              </button>
            </ToolHint>
            <ToolHint text="Whole word" toolhintId="searchbar-wholeword-toolhint" place="top">
              <button className={`searchbar-icon-btn ${wholeWord ? 'active' : ''}`} onClick={handleToggleWholeWord}>
                <IconLetterW size={14} />
              </button>
            </ToolHint>
            <button className="searchbar-icon-btn" title="Previous" onClick={handlePrev}>
              <IconArrowUp size={14} />
            </button>
            <button className="searchbar-icon-btn" title="Next" onClick={handleNext}>
              <IconArrowDown size={14} />
            </button>
            <button className="searchbar-icon-btn" title="Close" onClick={handleSearchBarClose}>
              <IconX size={14} />
            </button>
          </div>
          {regexError && regex && <div className="searchbar-error">{regexError}</div>}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CodeMirrorSearch;
