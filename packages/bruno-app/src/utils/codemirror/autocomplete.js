import { mockDataFunctions } from '@usebruno/common';
import { API_HINT_GROUPS, API_ROOTS, getApiEntries, getHintTexts, renderApiDoc } from 'utils/codemirror/scriptApi';

const CodeMirror = require('codemirror');

// Mock data functions - prefixed with $
const MOCK_DATA_HINTS = Object.keys(mockDataFunctions).map((key) => `$${key}`);

// Constants for word pattern matching.
// `-` is placed last so it is a literal hyphen, not a range operator — `$-/`
// would otherwise match `( ) % & ' * + ,`
const WORD_PATTERN = /[\w.$/-]/;
const VARIABLE_PATTERN = /\{\{([\w$.-]*)$/;
const NON_CHARACTER_KEYS = /^(?!Shift|Tab|Enter|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Meta|Alt|Home|End\s)\w*/;

/**
 * Generate progressive hints for a given full hint
 * @param {string} fullHint - The complete hint string
 * @returns {string[]} Array of progressive hints
 */
const generateProgressiveHints = (fullHint) => {
  const parts = fullHint.split('.');
  const progressiveHints = [];

  for (let i = 1; i <= parts.length; i++) {
    progressiveHints.push(parts.slice(0, i).join('.'));
  }

  return progressiveHints;
};

/**
 * Check if a variable key should be skipped
 * @param {string} key - The variable key to check
 * @returns {boolean} True if the key should be skipped
 */
const shouldSkipVariableKey = (key) => {
  return key === 'pathParams' || key === 'maskedEnvVariables' || key === 'process';
};

/**
 * Transform variables object into flat hint list
 * @param {Object} allVariables - All available variables
 * @returns {string[]} Array of variable hints
 */
const transformVariablesToHints = (allVariables = {}) => {
  const hints = [];

  // Process all variables without type-specific handling
  Object.keys(allVariables).forEach((key) => {
    if (!shouldSkipVariableKey(key)) {
      hints.push(key);
    }
  });

  // Handle process environment variables
  if (allVariables.process && allVariables.process.env) {
    Object.keys(allVariables.process.env).forEach((key) => {
      hints.push(`process.env.${key}`);
    });
  }

  return hints;
};

/**
 * Add API hints to categorized hints based on showHintsFor configuration
 * @param {Set} apiHints - Set to add API hints to
 * @param {string[]} showHintsFor - Array of hint groups to show
 */
const addApiHintsToSet = (apiHints, showHintsFor) => {
  getApiEntries(showHintsFor).forEach((entry) => {
    getHintTexts(entry).forEach((hint) => {
      generateProgressiveHints(hint).forEach((h) => apiHints.add(h));
    });
  });
};

/**
 * Add variable hints to categorized hints
 * @param {Set} variableHints - Set to add variable hints to
 * @param {Object} allVariables - All available variables
 */
const addVariableHintsToSet = (variableHints, allVariables) => {
  // Add mock data hints
  MOCK_DATA_HINTS.forEach((hint) => {
    generateProgressiveHints(hint).forEach((h) => variableHints.add(h));
  });

  // Add variable hints with progressive hints
  const variableHintsList = transformVariablesToHints(allVariables);
  variableHintsList.forEach((hint) => {
    generateProgressiveHints(hint).forEach((h) => variableHints.add(h));
  });
};

/**
 * Add custom hints to categorized hints
 * @param {Set} anywordHints - Set to add custom hints to
 * @param {string[]} customHints - Array of custom hints
 */
const addCustomHintsToSet = (anywordHints, customHints) => {
  if (customHints && Array.isArray(customHints)) {
    customHints.forEach((hint) => {
      generateProgressiveHints(hint).forEach((h) => anywordHints.add(h));
    });
  }
};

/**
 * Build categorized hints list from all sources
 * @param {Object} allVariables - All available variables
 * @param {string[]} anywordAutocompleteHints - Custom autocomplete hints
 * @param {Object} options - Configuration options
 * @returns {Object} Categorized hints object
 */
const buildCategorizedHintsList = (allVariables = {}, anywordAutocompleteHints = [], options = {}) => {
  const categorizedHints = {
    api: new Set(),
    variables: new Set(),
    anyword: new Set()
  };

  const showHintsFor = options.showHintsFor || [];

  // Add different types of hints
  addApiHintsToSet(categorizedHints.api, showHintsFor);
  addVariableHintsToSet(categorizedHints.variables, allVariables);
  addCustomHintsToSet(categorizedHints.anyword, anywordAutocompleteHints);

  return {
    api: Array.from(categorizedHints.api).sort(),
    variables: Array.from(categorizedHints.variables).sort(),
    anyword: Array.from(categorizedHints.anyword).sort()
  };
};

/**
 * Calculate replacement positions for variable context
 * @param {Object} cursor - Current cursor position
 * @param {Object} startPos - Start position of variable
 * @param {string} wordMatch - The matched word
 * @returns {Object} From and to positions for replacement
 */
const calculateVariableReplacementPositions = (cursor, startPos, wordMatch) => {
  let replaceFrom, replaceTo;

  if (wordMatch.endsWith('.')) {
    replaceFrom = cursor;
    replaceTo = cursor;
  } else {
    const lastDotIndex = wordMatch.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      replaceFrom = { line: cursor.line, ch: startPos.ch + lastDotIndex + 1 };
      replaceTo = cursor;
    } else {
      replaceFrom = startPos;
      replaceTo = cursor;
    }
  }

  return { replaceFrom, replaceTo };
};

/**
 * Calculate replacement positions for regular word context
 * @param {Object} cursor - Current cursor position
 * @param {number} start - Start position of word
 * @param {number} end - End position of word
 * @param {string} word - The matched word
 * @returns {Object} From and to positions for replacement
 */
const calculateWordReplacementPositions = (cursor, start, end, word) => {
  let replaceFrom, replaceTo;

  if (word.endsWith('.')) {
    replaceFrom = { line: cursor.line, ch: end };
    replaceTo = cursor;
  } else {
    const lastDotIndex = word.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      replaceFrom = { line: cursor.line, ch: start + lastDotIndex + 1 };
      replaceTo = { line: cursor.line, ch: end };
    } else {
      replaceFrom = { line: cursor.line, ch: start };
      replaceTo = { line: cursor.line, ch: end };
    }
  }

  return { replaceFrom, replaceTo };
};

/**
 * Determine context based on word prefix
 * @param {string} word - The word to analyze
 * @returns {string} The determined context
 */
const determineWordContext = (word) => {
  const isApiHint = API_ROOTS.some(
    (apiRoot) => apiRoot.toLowerCase().startsWith(word.toLowerCase()) || word.toLowerCase().startsWith(apiRoot.toLowerCase())
  );

  if (isApiHint) {
    return 'api';
  }

  return 'anyword';
};

/**
 * Extract word from current line with boundaries
 * @param {string} currentLine - The current line content
 * @param {number} cursorPosition - Current cursor position
 * @returns {Object|null} Word information or null if no word found
 */
const extractWordFromLine = (currentLine, cursorPosition) => {
  let start = cursorPosition;
  let end = start;

  while (end < currentLine.length && WORD_PATTERN.test(currentLine.charAt(end))) {
    ++end;
  }
  while (start && WORD_PATTERN.test(currentLine.charAt(start - 1))) {
    --start;
  }

  if (start === end) {
    return null;
  }

  return {
    word: currentLine.slice(start, end),
    start,
    end
  };
};

/**
 * Get current word being typed at cursor position with context information
 * @param {Object} cm - CodeMirror instance
 * @returns {Object|null} Word information with context or null
 */
const getCurrentWordWithContext = (cm) => {
  const cursor = cm.getCursor();
  const currentLine = cm.getLine(cursor.line);
  const currentString = cm.getRange({ line: cursor.line, ch: 0 }, cursor);

  // Check for variable pattern {{word
  const variableMatch = currentString.match(VARIABLE_PATTERN);
  if (variableMatch) {
    const wordMatch = variableMatch[1];
    const startPos = { line: cursor.line, ch: currentString.lastIndexOf('{{') + 2 };
    const { replaceFrom, replaceTo } = calculateVariableReplacementPositions(cursor, startPos, wordMatch);

    return {
      word: wordMatch,
      from: replaceFrom,
      to: replaceTo,
      context: 'variables',
      requiresBraces: true
    };
  }

  // Check for regular word
  const wordInfo = extractWordFromLine(currentLine, cursor.ch);
  if (!wordInfo) {
    return null;
  }

  const { word, start, end } = wordInfo;
  const { replaceFrom, replaceTo } = calculateWordReplacementPositions(cursor, start, end, word);
  const context = determineWordContext(word);

  return {
    word,
    from: replaceFrom,
    to: replaceTo,
    context,
    requiresBraces: false
  };
};

/**
 * Extract next segment suggestions from filtered hints
 * @param {string[]} filteredHints - Pre-filtered hints
 * @param {string} currentInput - Current user input
 * @returns {string[]} Array of suggestion segments
 */
const extractNextSegmentSuggestions = (filteredHints, currentInput) => {
  const prefixMatches = new Set();
  const substringMatches = new Set();
  const lowerInput = currentInput.toLowerCase();

  filteredHints.forEach((hint) => {
    const lowerHint = hint.toLowerCase();

    // For prefix matches, use the original progressive logic
    if (lowerHint.startsWith(lowerInput)) {
      // Handle exact match case
      if (lowerHint === lowerInput) {
        prefixMatches.add(hint.substring(hint.lastIndexOf('.') + 1));
        return;
      }

      const inputLength = currentInput.length;

      if (currentInput.endsWith('.')) {
        // Show next segment after the dot
        const afterDot = hint.substring(inputLength);
        const nextDot = afterDot.indexOf('.');
        const segment = nextDot === -1 ? afterDot : afterDot.substring(0, nextDot);
        prefixMatches.add(segment);
      } else {
        // Show complete current segment
        const lastDotInInput = currentInput.lastIndexOf('.');
        const currentSegmentStart = lastDotInInput + 1;
        const nextDotAfterInput = hint.indexOf('.', currentSegmentStart);
        const segment
          = nextDotAfterInput === -1
            ? hint.substring(currentSegmentStart)
            : hint.substring(currentSegmentStart, nextDotAfterInput);
        prefixMatches.add(segment);
      }
    } else if (lowerHint.includes(lowerInput)) {
      // For substring matches (search within words), suggest the complete hint
      substringMatches.add(hint);
    }
  });

  // Return prefix matches first, then substring matches
  return [...Array.from(prefixMatches).sort(), ...Array.from(substringMatches).sort()];
};

/**
 * Extract the relevant part of hints based on user input
 * @param {string[]} filteredHints - Pre-filtered hints
 * @param {string} currentInput - Current user input
 * @returns {string[]} Array of hint parts
 */
const getHintParts = (filteredHints, currentInput) => {
  if (!filteredHints || filteredHints.length === 0) {
    return [];
  }

  return extractNextSegmentSuggestions(filteredHints, currentInput);
};

/**
 * Get allowed hints based on context and configuration
 * @param {Object} categorizedHints - All categorized hints
 * @param {string} context - Current context
 * @param {string[]} showHintsFor - Allowed hint types
 * @returns {string[]} Array of allowed hints
 */
const getAllowedHintsByContext = (categorizedHints, context, showHintsFor) => {
  let allowedHints = [];

  if (context === 'variables' && showHintsFor.includes('variables')) {
    allowedHints = [...categorizedHints.variables];
  } else if (context === 'api') {
    const hasApiHints = showHintsFor.some((group) => API_HINT_GROUPS.includes(group));
    if (hasApiHints) {
      allowedHints = [...categorizedHints.api];
    }
  } else if (context === 'anyword') {
    allowedHints = [...categorizedHints.anyword];
  }

  return allowedHints;
};

/**
 * Filter hints based on current word and allowed hint types
 * @param {Object} categorizedHints - All categorized hints
 * @param {string} currentWord - Current word being typed
 * @param {string} context - Current context
 * @param {string[]} showHintsFor - Allowed hint types
 * @returns {string[]} Filtered hints
 */
const filterHintsByContext = (categorizedHints, currentWord, context, showHintsFor = []) => {
  if (!currentWord) {
    return [];
  }

  const allowedHints = getAllowedHintsByContext(categorizedHints, context, showHintsFor);

  const lowerWord = currentWord.toLowerCase();
  const filtered = allowedHints.filter((hint) => {
    return hint.toLowerCase().includes(lowerWord);
  });

  const hintParts = getHintParts(filtered, currentWord);

  return hintParts.slice(0, 50);
};

/**
 * Create hint list for variables context
 * @param {string[]} filteredHints - Filtered hints
 * @param {Object} from - Start position
 * @param {Object} to - End position
 * @returns {Object} Hint object with list and positions
 */
const createVariableHintList = (filteredHints, from, to) => {
  const hintList = filteredHints.map((hint) => ({
    text: hint,
    displayText: hint
  }));

  return {
    list: hintList,
    from,
    to
  };
};

/**
 * Create hint list for non-variable contexts
 * @param {string[]} filteredHints - Filtered hints
 * @param {Object} from - Start position
 * @param {Object} to - End position
 * @returns {Object} Hint object with list and positions
 */
const createStandardHintList = (filteredHints, from, to) => {
  return {
    list: filteredHints,
    from,
    to
  };
};

/**
 * Renders an API hint row: the hint text, then the member's summary.
 * @param {HTMLElement} element - The row
 * @param {Object} data - The hint list
 * @param {Object} completion - The hint
 */
const renderApiHint = (element, data, completion) => {
  element.classList.add('CodeMirror-hint-api');

  const name = document.createElement('span');
  name.className = 'CodeMirror-hint-api-name';
  name.textContent = completion.displayText;
  element.appendChild(name);

  if (completion.entry.summary) {
    const summary = document.createElement('span');
    summary.className = 'CodeMirror-hint-api-summary';
    summary.textContent = completion.entry.summary;
    element.appendChild(summary);
  }
};

const DETAILS_GAP_PX = 4;

/**
 * Places the detail panel beside the hint list, on the right when it fits, level with the row.
 * @param {HTMLElement} panel
 * @param {HTMLElement} row - The highlighted hint row
 */
const positionDetailsPanel = (panel, row) => {
  const list = row.parentNode.getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();
  const fitsRight = list.right + DETAILS_GAP_PX + panel.offsetWidth <= window.innerWidth;
  const left = fitsRight ? list.right + DETAILS_GAP_PX : list.left - DETAILS_GAP_PX - panel.offsetWidth;
  const top = Math.min(rowBox.top, window.innerHeight - panel.offsetHeight - DETAILS_GAP_PX);

  panel.style.left = `${Math.max(0, left)}px`;
  panel.style.top = `${Math.max(0, top)}px`;
};

/**
 * Shows the docs of the highlighted API hint in a panel beside the hint list, for as long as the
 * list is open.
 * @param {Object} hintResult - The `{ list, from, to }` object handed to `showHint`
 */
const attachApiDetailsPanel = (hintResult) => {
  let panel = null;

  const hidePanel = () => {
    panel?.remove();
    panel = null;
  };

  CodeMirror.on(hintResult, 'select', (completion, row) => {
    hidePanel();
    if (!completion?.entry || !row?.parentNode) return;

    panel = document.createElement('div');
    panel.className = 'CodeMirror-hint-details';
    panel.setAttribute('data-testid', 'autocomplete-hint-details');
    panel.appendChild(renderApiDoc(completion.entry));
    document.body.appendChild(panel);
    positionDetailsPanel(panel, row);
  });
  CodeMirror.on(hintResult, 'close', hidePanel);
};

/**
 * Create the hint list for the API context. A hint that names a documented member is rendered with
 * its summary, and its docs show beside the list while it is highlighted.
 * @param {string[]} filteredHints - Filtered hints: segments after `word`'s last dot, or whole hints
 * @param {string} word - The word being completed
 * @param {Object} from - Start position
 * @param {Object} to - End position
 * @param {string[]} showHintsFor - Allowed hint types
 * @returns {Object} Hint object with list and positions
 */
const createApiHintList = (filteredHints, word, from, to, showHintsFor) => {
  const entriesByHint = new Map(
    getApiEntries(showHintsFor).flatMap((entry) => getHintTexts(entry).map((hint) => [hint, entry]))
  );
  const prefix = word.slice(0, word.lastIndexOf('.') + 1);

  const list = filteredHints.map((hint) => {
    const entry = entriesByHint.get(hint) || entriesByHint.get(`${prefix}${hint}`);
    return entry ? { text: hint, displayText: hint, entry, render: renderApiHint } : hint;
  });

  const hintResult = { list, from, to };
  attachApiDetailsPanel(hintResult);
  return hintResult;
};

/**
 * Show root-level API hints when the editor is empty
 * @param {Object} cm - CodeMirror instance
 * @param {string[]} showHintsFor - Array of hint groups to show (e.g., ['req', 'res', 'bru'])
 * @returns {boolean} True if hints were shown, false otherwise
 */
export const showRootHints = (cm, showHintsFor = []) => {
  const wordInfo = getCurrentWordWithContext(cm);
  // If user is currently typing a word, let handleKeyupForAutocomplete
  // handle it instead of showing root hints.
  if (wordInfo) {
    return false;
  }

  const hints = API_ROOTS.filter((root) => showHintsFor.includes(root));

  if (hints.length === 0) return false;

  const cursor = cm.getCursor();
  const hintList = createStandardHintList(hints, cursor, cursor);

  cm.showHint({
    hint: () => hintList,
    completeSingle: false
  });
  return true;
};

/**
 * Bruno AutoComplete Helper - Main function with context awareness
 * @param {Object} cm - CodeMirror instance
 * @param {Object} allVariables - All available variables
 * @param {string[]} anywordAutocompleteHints - Custom autocomplete hints
 * @param {Object} options - Configuration options
 * @returns {Object|null} Hint object or null
 */
export const getAutoCompleteHints = (cm, allVariables = {}, anywordAutocompleteHints = [], options = {}) => {
  if (!allVariables) {
    return null;
  }

  const wordInfo = getCurrentWordWithContext(cm);
  if (!wordInfo) {
    return null;
  }

  const { word, from, to, context, requiresBraces } = wordInfo;
  const showHintsFor = options.showHintsFor || [];

  // Check if this context requires braces but we're not in a brace context
  if (context === 'variables' && !requiresBraces) {
    return null;
  }

  const categorizedHints = buildCategorizedHintsList(allVariables, anywordAutocompleteHints, options);
  const filteredHints = filterHintsByContext(categorizedHints, word, context, showHintsFor);

  if (filteredHints.length === 0) {
    return null;
  }

  if (context === 'variables') {
    return createVariableHintList(filteredHints, from, to);
  }

  if (context === 'api') {
    return createApiHintList(filteredHints, word, from, to, showHintsFor);
  }

  return createStandardHintList(filteredHints, from, to);
};

/**
 * Handle click events for autocomplete
 * @param {Object} cm - CodeMirror instance
 * @param {Object} options - Configuration options
 */
const handleClickForAutocomplete = (cm, options) => {
  const allVariables = options.getAllVariables?.() || {};
  const anywordAutocompleteHints = options.getAnywordAutocompleteHints?.() || [];
  const showHintsFor = options.showHintsFor || [];

  // Build all available hints
  const categorizedHints = buildCategorizedHintsList(allVariables, anywordAutocompleteHints, options);

  // Combine all hints based on showHintsFor configuration
  let allHints = [];

  // Add API hints if enabled
  const hasApiHints = showHintsFor.some((group) => API_HINT_GROUPS.includes(group));
  if (hasApiHints) {
    allHints = [...allHints, ...categorizedHints.api];
  }

  // Add variable hints if enabled
  if (showHintsFor.includes('variables')) {
    allHints = [...allHints, ...categorizedHints.variables];
  }

  // Add anyword hints (always included)
  allHints = [...allHints, ...categorizedHints.anyword];

  // Remove duplicates and sort
  allHints = [...new Set(allHints)].sort();

  if (allHints.length === 0) {
    return;
  }

  const cursor = cm.getCursor();

  if (cursor.ch > 0) return;

  // Defer showHint to ensure editor is focused
  setTimeout(() => {
    cm.showHint({
      hint: () => createApiHintList(allHints, '', cursor, cursor, showHintsFor),
      completeSingle: false
    });
  }, 0);
};

/**
 * Handle keyup events for autocomplete
 * @param {Object} cm - CodeMirror instance
 * @param {Event} event - The keyup event
 * @param {Object} options - Configuration options
 */
const handleKeyupForAutocomplete = (cm, event, options) => {
  // Skip non-character keys
  if (!NON_CHARACTER_KEYS.test(event?.key)) {
    return;
  }

  const allVariables = options.getAllVariables?.() || {};
  const anywordAutocompleteHints = options.getAnywordAutocompleteHints?.() || [];
  const hints = getAutoCompleteHints(cm, allVariables, anywordAutocompleteHints, options);

  if (!hints) {
    const wordInfo = getCurrentWordWithContext(cm);
    if (cm.state.completionActive && wordInfo) {
      cm.state.completionActive.close();
    }
    return;
  }

  cm.showHint({
    hint: () => hints,
    completeSingle: false
  });
};

/**
 * Setup Bruno AutoComplete Helper on a CodeMirror editor
 * @param {Object} editor - CodeMirror editor instance
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export const setupAutoComplete = (editor, options = {}) => {
  if (!editor) {
    return;
  }

  const keyupHandler = (cm, event) => {
    handleKeyupForAutocomplete(cm, event, options);
  };

  editor.on('keyup', keyupHandler);

  const clickHandler = (cm) => {
    // Only show hints on click if the option is enabled and there's no active completion
    if (options.showHintsOnClick) {
      handleClickForAutocomplete(cm, options);
    }
  };

  // Add click handler if showHintsOnClick is enabled
  if (options.showHintsOnClick) {
    editor.on('mousedown', clickHandler);
  }

  return () => {
    editor.off('keyup', keyupHandler);
    if (options.showHintsOnClick) {
      editor.off('mousedown', clickHandler);
    }
  };
};

// Exported for testing
export { extractNextSegmentSuggestions, WORD_PATTERN };

// Initialize autocomplete command if not already present
if (!CodeMirror.commands.autocomplete) {
  CodeMirror.commands.autocomplete = (cm, hint, options) => {
    cm.showHint({ hint, ...options });
  };
}
