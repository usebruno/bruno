import { mockDataFunctions } from '@usebruno/common';

const CodeMirror = require('codemirror');

// Static API hints - Bruno JavaScript API (subgrouped by category)
const STATIC_API_HINTS = {
  req: [
    'req',
    'req.url',
    'req.method',
    'req.headers',
    'req.body',
    'req.timeout',
    'req.getUrl()',
    'req.setUrl(url)',
    'req.getMethod()',
    'req.getAuthMode()',
    'req.setMethod(method)',
    'req.getHeader(name)',
    'req.getHeaders()',
    'req.setHeader(name, value)',
    'req.setHeaders(data)',
    'req.getBody()',
    'req.setBody(data)',
    'req.setMaxRedirects(maxRedirects)',
    'req.getTimeout()',
    'req.setTimeout(timeout)',
    'req.getExecutionMode()',
    'req.getName()',
    'req.getTags()',
    'req.disableParsingResponseJson()',
    'req.onFail(function(err) {})'
  ],
  res: [
    'res',
    'res.status',
    'res.statusText',
    'res.headers',
    'res.body',
    'res.responseTime',
    'res.url',
    'res.getStatus()',
    'res.getStatusText()',
    'res.getHeader(name)',
    'res.getHeaders()',
    'res.getBody()',
    'res.setBody(data)',
    'res.getResponseTime()',
    'res.getSize()',
    'res.getSize().header',
    'res.getSize().body',
    'res.getSize().total',
    'res.getUrl()'
  ],
  bru: [
    'bru',
    'bru.cwd()',
    'bru.getEnvName()',
    'bru.getProcessEnv(key)',
    'bru.hasEnvVar(key)',
    'bru.getEnvVar(key)',
    'bru.getFolderVar(key)',
    'bru.getCollectionVar(key)',
    'bru.setEnvVar(key, value)',
    'bru.setEnvVar(key, value, options)',
    'bru.deleteEnvVar(key)',
    'bru.hasVar(key)',
    'bru.getVar(key)',
    'bru.setVar(key,value)',
    'bru.deleteVar(key)',
    'bru.deleteAllVars()',
    'bru.setNextRequest(requestName)',
    'bru.getRequestVar(key)',
    'bru.runRequest(requestPathName)',
    'bru.getAssertionResults()',
    'bru.getTestResults()',
    'bru.sleep(ms)',
    'bru.getCollectionName()',
    'bru.isSafeMode()',
    'bru.getGlobalEnvVar(key)',
    'bru.setGlobalEnvVar(key, value)',
    'bru.runner',
    'bru.runner.setNextRequest(requestName)',
    'bru.runner.skipRequest()',
    'bru.runner.stopExecution()',
    'bru.interpolate(str)',
    'bru.cookies',
    'bru.cookies.jar()',
    'bru.cookies.jar().getCookie(url, name, callback)',
    'bru.cookies.jar().getCookies(url, callback)',
    'bru.cookies.jar().setCookie(url, name, value, callback)',
    'bru.cookies.jar().setCookie(url, cookieObject, callback)',
    'bru.cookies.jar().setCookies(url, cookiesArray, callback)',
    'bru.cookies.jar().clear(callback)',
    'bru.cookies.jar().deleteCookies(url, callback)',
    'bru.cookies.jar().deleteCookie(url, name, callback)',
    'bru.utils',
    'bru.utils.minifyJson(json)',
    'bru.utils.minifyXml(xml)'
  ]
};

// Mock data functions - prefixed with $
const MOCK_DATA_HINTS = Object.keys(mockDataFunctions).map((key) => `$${key}`);

// Constants for word pattern matching
const WORD_PATTERN = /[\w.$-/]/;
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
 * @param {string[]} showHintsFor - Array of hint types to show
 */
const addApiHintsToSet = (apiHints, showHintsFor) => {
  const apiTypes = ['req', 'res', 'bru'];

  apiTypes.forEach((apiType) => {
    if (showHintsFor.includes(apiType)) {
      STATIC_API_HINTS[apiType].forEach((hint) => {
        generateProgressiveHints(hint).forEach((h) => apiHints.add(h));
      });
    }
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
  if (word.startsWith('req') || word.startsWith('res') || word.startsWith('bru')) {
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
  const suggestions = new Set();

  filteredHints.forEach((hint) => {
    if (!hint.toLowerCase().startsWith(currentInput.toLowerCase())) {
      return;
    }

    // Handle exact match case
    if (hint.toLowerCase() === currentInput.toLowerCase()) {
      suggestions.add(hint.substring(hint.lastIndexOf('.') + 1));
      return;
    }

    const inputLength = currentInput.length;

    if (currentInput.endsWith('.')) {
      // Show next segment after the dot
      const afterDot = hint.substring(inputLength);
      const nextDot = afterDot.indexOf('.');
      const segment = nextDot === -1 ? afterDot : afterDot.substring(0, nextDot);
      suggestions.add(segment);
    } else {
      // Show complete current segment
      const lastDotInInput = currentInput.lastIndexOf('.');
      const currentSegmentStart = lastDotInInput + 1;
      const nextDotAfterInput = hint.indexOf('.', currentSegmentStart);
      const segment = nextDotAfterInput === -1
        ? hint.substring(currentSegmentStart)
        : hint.substring(currentSegmentStart, nextDotAfterInput);
      suggestions.add(segment);
    }
  });

  return Array.from(suggestions).sort();
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
    const hasApiHints = showHintsFor.some((hint) => ['req', 'res', 'bru'].includes(hint));
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

  const filtered = allowedHints.filter((hint) => {
    return hint.toLowerCase().startsWith(currentWord.toLowerCase());
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
  const hasApiHints = showHintsFor.some((hint) => ['req', 'res', 'bru'].includes(hint));
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
      hint: () => ({
        list: allHints,
        from: cursor,
        to: cursor
      }),
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
    if (cm.state.completionActive) {
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

// Initialize autocomplete command if not already present
if (!CodeMirror.commands.autocomplete) {
  CodeMirror.commands.autocomplete = (cm, hint, options) => {
    cm.showHint({ hint, ...options });
  };
}
