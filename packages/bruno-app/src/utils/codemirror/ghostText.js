import { getAutoCompleteHints } from './autocomplete';
import { getAISuggestion } from '../ai/suggestions';

/**
 * Ghost text suggestion for CodeMirror v5
 * Shows inline faded text suggestions as the user types
 * Supports both static hints and AI-powered suggestions
 *
 * Inspired by codemirror-copilot architecture
 */

// Track active ghost text widgets per editor instance
const ghostTextState = new WeakMap();

// Local suggestions cache using prefix+suffix key
const localSuggestionsCache = {};

/**
 * Debounce a promise-returning function with proper cancellation
 * @param {Function} fn - The async function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function that returns a promise
 */
function debouncePromise(fn, wait) {
  let timeoutId = null;
  let pendingReject = null;

  return function debounced(...args) {
    // Cancel any pending request
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (pendingReject) {
      pendingReject({ cancelled: true });
      pendingReject = null;
    }

    return new Promise((resolve, reject) => {
      pendingReject = reject;
      timeoutId = setTimeout(async () => {
        pendingReject = null;
        timeoutId = null;
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
  };
}

/**
 * Generate cache key from code context
 * @param {string} prefix - Code before cursor
 * @param {string} suffix - Code after cursor
 * @returns {string} Cache key
 */
function getCacheKey(prefix, suffix) {
  return `${prefix}<:|:>${suffix}`;
}

/**
 * Clear the local suggestion cache
 */
function clearLocalCache() {
  Object.keys(localSuggestionsCache).forEach((key) => {
    delete localSuggestionsCache[key];
  });
}

/**
 * Get the ghost text state for an editor
 * @param {Object} cm - CodeMirror instance
 * @returns {Object} Ghost text state
 */
const getState = (cm) => {
  if (!ghostTextState.has(cm)) {
    ghostTextState.set(cm, {
      widget: null,
      suggestion: null,
      from: null,
      isAI: false,
      debouncedFetch: null
    });
  }
  return ghostTextState.get(cm);
};

/**
 * Clear any existing ghost text widget
 * @param {Object} cm - CodeMirror instance
 */
const clearGhostText = (cm) => {
  const state = getState(cm);
  if (state.widget) {
    state.widget.clear();
    state.widget = null;
  }
  state.suggestion = null;
  state.from = null;
  state.isAI = false;
};

/**
 * Create a ghost text DOM element
 * @param {string} text - The ghost text to display
 * @param {boolean} isAI - Whether this is an AI suggestion
 * @returns {HTMLElement} The ghost text element
 */
const createGhostTextElement = (text, isAI = false) => {
  const span = document.createElement('span');
  span.className = `cm-ghost-text${isAI ? ' cm-ghost-text-ai' : ''}`;
  span.textContent = text;
  span.style.cssText = `
    opacity: 0.4;
    pointer-events: none;
    font-style: italic;
  `;
  return span;
};

/**
 * Get the best suggestion for the current cursor position (static hints)
 * @param {Object} cm - CodeMirror instance
 * @param {Object} options - Autocomplete options
 * @returns {Object|null} Suggestion info or null
 */
const getBestStaticSuggestion = (cm, options) => {
  const allVariables = options.getAllVariables?.() || {};
  const anywordAutocompleteHints = options.getAnywordAutocompleteHints?.() || [];

  const hints = getAutoCompleteHints(cm, allVariables, anywordAutocompleteHints, options);

  if (!hints || !hints.list || hints.list.length === 0) {
    return null;
  }

  // Get the first/best suggestion
  const firstHint = hints.list[0];
  const suggestionText = typeof firstHint === 'object' ? firstHint.text : firstHint;

  // Get what the user has typed so far
  const cursor = cm.getCursor();
  const currentTyped = cm.getRange(hints.from, hints.to);

  // Only show ghost text if there's something to complete
  if (!suggestionText || suggestionText.toLowerCase() === currentTyped.toLowerCase()) {
    return null;
  }

  // Calculate the remaining text to show as ghost
  // The suggestion should start with what's typed (case-insensitive match)
  if (!suggestionText.toLowerCase().startsWith(currentTyped.toLowerCase())) {
    return null;
  }

  const ghostText = suggestionText.substring(currentTyped.length);

  if (!ghostText) {
    return null;
  }

  return {
    ghostText,
    fullSuggestion: suggestionText,
    from: hints.from,
    to: hints.to,
    cursorPos: cursor,
    isAI: false
  };
};

/**
 * Display ghost text widget
 * @param {Object} cm - CodeMirror instance
 * @param {string} ghostText - The ghost text to display
 * @param {string} fullSuggestion - The full suggestion text
 * @param {Object} from - Start position for replacement
 * @param {boolean} isAI - Whether this is an AI suggestion
 */
const displayGhostText = (cm, ghostText, fullSuggestion, from, isAI = false) => {
  // Clear existing first
  const state = getState(cm);
  if (state.widget) {
    state.widget.clear();
  }

  const cursor = cm.getCursor();

  // Create the ghost text widget
  const ghostElement = createGhostTextElement(ghostText, isAI);

  // Insert the widget as a bookmark at the cursor position
  state.widget = cm.setBookmark(cursor, {
    widget: ghostElement,
    insertLeft: true
  });

  state.suggestion = fullSuggestion;
  state.from = from;
  state.isAI = isAI;
};

/**
 * Fetch AI suggestion with caching
 * @param {Object} cm - CodeMirror instance
 * @param {Object} options - Configuration options
 * @returns {Promise<string|null>} Suggestion text or null
 */
const fetchAISuggestion = async (cm, options) => {
  const code = cm.getValue();
  const cursor = cm.getCursor();
  const cursorPosition = cm.indexFromPos(cursor);

  // Split code into prefix and suffix at cursor position
  const prefix = code.slice(0, cursorPosition);
  const suffix = code.slice(cursorPosition);

  // Check local cache first
  const cacheKey = getCacheKey(prefix, suffix);
  if (localSuggestionsCache[cacheKey]) {
    return localSuggestionsCache[cacheKey];
  }

  // Build request context if available
  const requestContext = options.getRequestContext?.() || null;

  const result = await getAISuggestion({
    code,
    cursorPosition,
    scriptType: options.scriptType,
    requestContext
  });

  if (result.suggestion && !result.error) {
    // Cache the result
    localSuggestionsCache[cacheKey] = result.suggestion;
    return result.suggestion;
  }

  return null;
};

/**
 * Get AI suggestion for the current code
 * @param {Object} cm - CodeMirror instance
 * @param {Object} options - Configuration options
 */
const getAISuggestionAsync = async (cm, options) => {
  // Only use AI for script editors (tests, pre-request, post-response)
  const scriptType = options.scriptType;

  if (!scriptType || !['tests', 'pre-request', 'post-response'].includes(scriptType)) {
    return;
  }

  const code = cm.getValue();
  const cursor = cm.getCursor();
  const cursorPosition = cm.indexFromPos(cursor);

  // Don't trigger AI for very short inputs
  if (code.length < 5) {
    return;
  }

  // Check if there's already text after cursor on the same line
  // But allow suggestions if only closing brackets/parens/quotes remain
  const lineContent = cm.getLine(cursor.line);
  const textAfterCursor = lineContent.substring(cursor.ch).trim();
  const onlyClosingChars = /^[\)\]\}\"\'\;\,\s]*$/;
  if (textAfterCursor.length > 0 && !onlyClosingChars.test(textAfterCursor)) {
    return; // Don't suggest if there's meaningful code after cursor
  }

  // Get or create debounced fetch function for this editor
  const state = getState(cm);
  if (!state.debouncedFetch) {
    state.debouncedFetch = debouncePromise(fetchAISuggestion, options.delay || 500);
  }

  try {
    const suggestion = await state.debouncedFetch(cm, options);

    if (suggestion) {
      const currentCursor = cm.getCursor();
      const currentPos = cm.indexFromPos(currentCursor);

      // Only show if cursor hasn't moved
      if (currentPos === cursorPosition) {
        displayGhostText(cm, suggestion, suggestion, { line: cursor.line, ch: cursor.ch }, true);
      }
    }
  } catch (error) {
    // Ignore cancelled requests
    if (error?.cancelled) {
      return;
    }
    console.error('[GhostText] AI suggestion error:', error);
  }
};

/**
 * Show ghost text at the current cursor position
 * @param {Object} cm - CodeMirror instance
 * @param {Object} options - Autocomplete options
 */
const showGhostText = (cm, options) => {
  // Clear any existing ghost text first
  clearGhostText(cm);

  // First try static suggestions (fast)
  const staticSuggestion = getBestStaticSuggestion(cm, options);

  if (staticSuggestion) {
    displayGhostText(
      cm,
      staticSuggestion.ghostText,
      staticSuggestion.fullSuggestion,
      staticSuggestion.from,
      false
    );
    return;
  }

  // If no static suggestion and AI is enabled, try AI (async)
  if (options.enableAI !== false) {
    getAISuggestionAsync(cm, options);
  }
};

/**
 * Accept the current ghost text suggestion
 * @param {Object} cm - CodeMirror instance
 * @returns {boolean} True if suggestion was accepted, false otherwise
 */
const acceptGhostText = (cm) => {
  const state = getState(cm);

  if (!state.suggestion) {
    return false;
  }

  const cursor = cm.getCursor();

  if (state.isAI) {
    // For AI suggestions, just insert at cursor
    cm.replaceRange(state.suggestion, cursor);
  } else {
    // For static suggestions, replace from the word start
    if (state.from) {
      cm.replaceRange(state.suggestion, state.from, cursor);
    } else {
      cm.replaceRange(state.suggestion, cursor);
    }
  }

  // Clear the ghost text
  clearGhostText(cm);

  return true;
};

/**
 * Handle keydown events for ghost text
 * @param {Object} cm - CodeMirror instance
 * @param {Event} event - The keydown event
 * @param {Object} options - Configuration options
 * @returns {boolean} True if event was handled
 */
const handleKeyDown = (cm, event, _options) => {
  const state = getState(cm);

  // Tab key accepts the suggestion
  if (event.key === 'Tab' && !event.shiftKey && state.suggestion) {
    event.preventDefault();
    event.stopPropagation();
    acceptGhostText(cm);
    return true;
  }

  // Escape clears the ghost text
  if (event.key === 'Escape' && state.suggestion) {
    clearGhostText(cm);
    return true;
  }

  // Right arrow at end of line accepts suggestion
  if (event.key === 'ArrowRight' && state.suggestion) {
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);
    if (cursor.ch === line.length) {
      event.preventDefault();
      event.stopPropagation();
      acceptGhostText(cm);
      return true;
    }
  }

  return false;
};

/**
 * Handle input/change events to update ghost text
 * @param {Object} cm - CodeMirror instance
 * @param {Object} options - Configuration options
 */
const handleChange = (cm, options) => {
  // Use requestAnimationFrame to ensure the cursor position is updated
  requestAnimationFrame(() => {
    showGhostText(cm, options);
  });
};

/**
 * Handle cursor activity - clear ghost text if cursor moves away
 * @param {Object} cm - CodeMirror instance
 */
const handleCursorActivity = (cm) => {
  const state = getState(cm);

  if (!state.widget) {
    return;
  }

  // Get the bookmark position
  const pos = state.widget.find();
  if (!pos) {
    clearGhostText(cm);
    return;
  }

  // If cursor is not at the ghost text position, clear it
  const cursor = cm.getCursor();
  if (cursor.line !== pos.line || cursor.ch !== pos.ch) {
    clearGhostText(cm);
  }
};

/**
 * Setup ghost text suggestions on a CodeMirror editor
 * @param {Object} editor - CodeMirror editor instance
 * @param {Object} options - Configuration options
 *   - enableGhostText: boolean - Enable/disable ghost text (default: true)
 *   - enableAI: boolean - Enable AI suggestions fallback (default: true)
 *   - delay: number - Debounce delay for AI requests (default: 500ms)
 *   - scriptType: string - Type of script (tests, pre-request, post-response)
 *   - getRequestContext: function - Returns request context for AI
 *   - getAllVariables: function - Returns all variables for static hints
 *   - getAnywordAutocompleteHints: function - Returns custom hints
 * @returns {Function} Cleanup function
 */
export const setupGhostText = (editor, options = {}) => {
  if (!editor || options.enableGhostText === false) {
    return () => {};
  }

  // Set default delay if not provided
  const mergedOptions = {
    delay: 500,
    ...options
  };

  const keydownHandler = (cm, event) => {
    handleKeyDown(cm, event, mergedOptions);
  };

  const changeHandler = (cm, changeObj) => {
    // Only show ghost text on user input, not on programmatic changes
    if (changeObj.origin === '+input' || changeObj.origin === '+delete' || changeObj.origin === 'paste') {
      // Use requestAnimationFrame for static suggestions (immediate)
      // AI suggestions are already debounced in fetchAISuggestion
      requestAnimationFrame(() => {
        handleChange(cm, mergedOptions);
      });
    }
  };

  const cursorHandler = (cm) => {
    handleCursorActivity(cm);
  };

  const blurHandler = (cm) => {
    clearGhostText(cm);
  };

  // Register event handlers
  editor.on('keydown', keydownHandler);
  editor.on('change', changeHandler);
  editor.on('cursorActivity', cursorHandler);
  editor.on('blur', blurHandler);

  // Return cleanup function
  return () => {
    clearGhostText(editor);
    // Clear the debounced fetch reference
    const state = ghostTextState.get(editor);
    if (state) {
      state.debouncedFetch = null;
    }
    editor.off('keydown', keydownHandler);
    editor.off('change', changeHandler);
    editor.off('cursorActivity', cursorHandler);
    editor.off('blur', blurHandler);
  };
};

export { clearGhostText, acceptGhostText, clearLocalCache };
