import { mockDataFunctions } from '@usebruno/common';
import { GRPC_API_HINTS } from 'utils/codemirror/grpcAutocompleteHints';
import { SCOPE_ICON, SCOPE_LABEL, SCOPE_ICON_COLOR_CLASS } from 'utils/codemirror/autocompleteScopes';

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
    'req.getHost()',
    'req.getPath()',
    'req.getQueryString()',
    'req.getMethod()',
    'req.getAuthMode()',
    'req.setMethod(method)',
    'req.getHeader(name)',
    'req.getHeaders()',
    'req.setHeader(name, value)',
    'req.setHeaders(data)',
    'req.deleteHeader(name)',
    'req.deleteHeaders(data)',
    'req.getBody()',
    'req.setBody(data)',
    'req.setMaxRedirects(maxRedirects)',
    'req.getTimeout()',
    'req.setTimeout(timeout)',
    'req.getExecutionMode()',
    'req.getName()',
    'req.getPathParams()',
    'req.getTags()',
    'req.disableParsingResponseJson()',
    'req.onFail(function(err) {})',
    'req.headerList',
    'req.headerList.get(name)',
    'req.headerList.one(name)',
    'req.headerList.all()',
    'req.headerList.count()',
    'req.headerList.has(name)',
    'req.headerList.has(name, value)',
    'req.headerList.find(fn)',
    'req.headerList.filter(fn)',
    'req.headerList.indexOf(item)',
    'req.headerList.each(fn)',
    'req.headerList.map(fn)',
    'req.headerList.reduce(fn, initialValue)',
    'req.headerList.toObject()',
    'req.headerList.toString()',
    'req.headerList.toJSON()',
    'req.headerList.add(headerObj)',
    'req.headerList.upsert(headerObj)',
    'req.headerList.remove(predicate)',
    'req.headerList.clear()',
    'req.headerList.populate(items)',
    'req.headerList.repopulate(items)',
    'req.headerList.assimilate(source, prune)'
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
    'res.getUrl()',
    'res.headerList',
    'res.headerList.get(name)',
    'res.headerList.one(name)',
    'res.headerList.all()',
    'res.headerList.count()',
    'res.headerList.has(name)',
    'res.headerList.has(name, value)',
    'res.headerList.find(fn)',
    'res.headerList.filter(fn)',
    'res.headerList.indexOf(item)',
    'res.headerList.each(fn)',
    'res.headerList.map(fn)',
    'res.headerList.reduce(fn, initialValue)',
    'res.headerList.toObject()',
    'res.headerList.toString()',
    'res.headerList.toJSON()'
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
    'bru.setCollectionVar(key, value)',
    'bru.hasCollectionVar(key)',
    'bru.deleteCollectionVar(key)',
    'bru.deleteAllCollectionVars()',
    'bru.getAllCollectionVars()',
    'bru.setEnvVar(key, value)',
    'bru.deleteEnvVar(key)',
    'bru.getAllEnvVars()',
    'bru.deleteAllEnvVars()',
    'bru.hasVar(key)',
    'bru.getVar(key)',
    'bru.setVar(key,value)',
    'bru.deleteVar(key)',
    'bru.deleteAllVars()',
    'bru.getAllVars()',
    'bru.setNextRequest(requestName)',
    'bru.getRequestVar(key)',
    'bru.runRequest(requestPathName)',
    'bru.sendRequest(requestConfig)',
    'bru.sendRequest(requestConfig, callback)',
    'bru.getAssertionResults()',
    'bru.getTestResults()',
    'bru.sleep(ms)',
    'bru.getCollectionName()',
    'bru.isSafeMode()',
    'bru.getOauth2CredentialVar(key)',
    'bru.hasGlobalEnvVar(key)',
    'bru.getGlobalEnvVar(key)',
    'bru.setGlobalEnvVar(key, value)',
    'bru.deleteGlobalEnvVar(key)',
    'bru.getAllGlobalEnvVars()',
    'bru.deleteAllGlobalEnvVars()',
    'bru.runner',
    'bru.runner.setNextRequest(requestName)',
    'bru.runner.skipRequest()',
    'bru.runner.stopExecution()',
    'bru.interpolate(str)',
    'bru.cookies',
    'bru.cookies.get(name)',
    'bru.cookies.has(name)',
    'bru.cookies.has(name, value)',
    'bru.cookies.one(name)',
    'bru.cookies.all()',
    'bru.cookies.count()',
    'bru.cookies.idx(index)',
    'bru.cookies.indexOf(item)',
    'bru.cookies.find(fn)',
    'bru.cookies.filter(fn)',
    'bru.cookies.each(fn)',
    'bru.cookies.map(fn)',
    'bru.cookies.reduce(fn, initialValue)',
    'bru.cookies.toObject()',
    'bru.cookies.toString()',
    'bru.cookies.add(cookieObj)',
    'bru.cookies.upsert(cookieObj)',
    'bru.cookies.remove(name)',
    'bru.cookies.delete(name)',
    'bru.cookies.clear()',
    'bru.cookies.jar()',
    'bru.cookies.jar().getCookie(url, name, callback)',
    'bru.cookies.jar().getCookies(url, callback)',
    'bru.cookies.jar().setCookie(url, name, value, callback)',
    'bru.cookies.jar().setCookie(url, cookieObject, callback)',
    'bru.cookies.jar().setCookies(url, cookiesArray, callback)',
    'bru.cookies.jar().clear(callback)',
    'bru.cookies.jar().deleteCookies(url, callback)',
    'bru.cookies.jar().deleteCookie(url, name, callback)',
    'bru.cookies.jar().hasCookie(url, name, callback)',
    'bru.utils',
    'bru.utils.minifyJson(json)',
    'bru.utils.minifyXml(xml)',
    'bru.resetOauth2Credential(credentialId)'
  ],
  ...GRPC_API_HINTS
};

// The values `showHintsFor` accepts.
const HINT_GROUPS = Object.keys(STATIC_API_HINTS);

// The globals every hint starts with.
const HINT_ROOTS = ['bru', 'req', 'res'];

// Mock data functions - prefixed with $
const MOCK_DATA_HINTS = Object.keys(mockDataFunctions).map((key) => `$${key}`);

// Constants for word pattern matching.
// `-` is placed last so it is a literal hyphen, not a range operator — `$-/`
// would otherwise match `( ) % & ' * + ,`
const WORD_PATTERN = /[\w.$/-]/;
const VARIABLE_PATTERN = /\{\{([\w$.-]*)$/;
const SINGLE_BRACE_PATTERN = /\{$/;
const NON_CHARACTER_KEYS = /^(?!Shift|Tab|Enter|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Meta|Alt|Home|End\s)\w*/;

const VARIABLE_SCOPE_DISPLAY_ORDER = [
  'global',
  'collection',
  'environment',
  'folder',
  'request',
  'oauth2',
  'runtime',
  'process.env'
];

/**
 * Rank a variable's scope for display grouping, per VARIABLE_SCOPE_DISPLAY_ORDER,
 * UNSCOPED_VARIABLE_RANK, and DYNAMIC_VARIABLE_RANK.
 * @param {string} [scope]
 * @returns {number}
 */
const getVariableScopeRank = (scope) => {
  if (scope === 'dynamic') {
    return VARIABLE_SCOPE_DISPLAY_ORDER.length + 1;
  }
  const index = VARIABLE_SCOPE_DISPLAY_ORDER.indexOf(scope);
  return index === -1 ? VARIABLE_SCOPE_DISPLAY_ORDER.length : index;
};

/**
 * Compare two hints for display ordering: group by scope first (per
 * VARIABLE_SCOPE_DISPLAY_ORDER), then alphabetically within the same scope.
 * @param {string} a
 * @param {string} b
 * @param {Object} [variableScopes] - name -> scope map
 * @returns {number}
 */
const compareHintsByScope = (a, b, variableScopes = {}) => {
  const rankDifference = getVariableScopeRank(variableScopes[a]) - getVariableScopeRank(variableScopes[b]);
  if (rankDifference !== 0) {
    return rankDifference;
  }
  return a.localeCompare(b);
};

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
 * @param {string} hint
 * @returns {boolean}
 */
const isProcessEnvDrillDownPrefix = (hint) => hint === 'process' || hint.startsWith('process.env');

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
 * Transforms the scope-tagged variable list into a flat list with name to scope map
 *
 * @param {Array<{name: string, scope?: string}>} scopedVariables - Available variables
 * @returns {{hints: string[], scopes: Object}} Hint names, and a name -> scope map
 */
const transformScopedVariablesToHints = (scopedVariables = []) => {
  const hints = [];
  const scopes = {};

  scopedVariables.forEach(({ name, scope } = {}) => {
    if (!name) return;
    hints.push(name);
    if (scope) {
      scopes[name] = scope;
    }
  });

  return { hints, scopes };
};

/**
 * Add API hints to categorized hints based on showHintsFor configuration
 * @param {Set} apiHints - Set to add API hints to
 * @param {string[]} showHintsFor - Array of hint groups to show
 */
const addApiHintsToSet = (apiHints, showHintsFor) => {
  HINT_GROUPS.forEach((group) => {
    if (showHintsFor.includes(group)) {
      STATIC_API_HINTS[group].forEach((hint) => {
        generateProgressiveHints(hint).forEach((h) => apiHints.add(h));
      });
    }
  });
};

/**
 * Add variable hints to categorized hints
 * @param {Set} variableHints - Set to add variable hints to
 * @param {Object|Array} allVariables - All available variables: object (brunoVarInfo.js's inline variable-value editor) or array (the editor components where we need scope also)
 * @param {Object} variableScopes - Map to populate with name -> scope, for icon rendering
 */
const addVariableHintsToSet = (variableHints, allVariables, variableScopes = {}) => {
  MOCK_DATA_HINTS.forEach((hint) => {
    variableScopes[hint] = 'dynamic';
    generateProgressiveHints(hint).forEach((h) => variableHints.add(h));
  });

  if (Array.isArray(allVariables)) {
    const scoped = transformScopedVariablesToHints(allVariables);
    Object.assign(variableScopes, scoped.scopes);

    scoped.hints.forEach((hint) => {
      // split into prefixes only for process.env, so that atomic variables like `api.host` are not truncated to `api`
      if (scoped.scopes[hint] === 'process.env') {
        generateProgressiveHints(hint).forEach((h) => variableHints.add(h));
      } else {
        variableHints.add(hint);
      }
    });
    return;
  }

  transformVariablesToHints(allVariables).forEach((hint) => {
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
 * @param {Object|Array} allVariables - All available variables: object (brunoVarInfo.js's inline variable-value editor) or array (the editor components where we need scope also)
 * @param {string[]} anywordAutocompleteHints - Custom autocomplete hints
 * @param {Object} options - Configuration options
 * @returns {Object} Categorized hints object, including a variableScopes name -> scope map
 */
const buildCategorizedHintsList = (allVariables = {}, anywordAutocompleteHints = [], options = {}) => {
  const categorizedHints = {
    api: new Set(),
    variables: new Set(),
    anyword: new Set()
  };
  const variableScopes = {};

  const showHintsFor = options.showHintsFor || [];

  // Add different types of hints
  addApiHintsToSet(categorizedHints.api, showHintsFor);
  addVariableHintsToSet(categorizedHints.variables, allVariables, variableScopes);
  addCustomHintsToSet(categorizedHints.anyword, anywordAutocompleteHints);

  return {
    api: Array.from(categorizedHints.api).sort(),
    variables: Array.from(categorizedHints.variables).sort(),
    anyword: Array.from(categorizedHints.anyword).sort(),
    variableScopes
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
 * @param {string} textAfterCursor - The line's content starting at the insertion point
 * @returns {number} Number of closing `}` characters still needed (0, 1, or 2)
 */
const countMissingClosingBraces = (textAfterCursor) => {
  const existingCloseBraces = (textAfterCursor || '').match(/^\}{0,2}/)[0].length;
  return Math.max(0, 2 - existingCloseBraces);
};

/**
 * Builds the variable insertion text, adding only the closing braces that are missing.
 * @param {string} textAfterCursor - The line's content starting at the cursor, i.e.
 *   whatever (if anything) already follows where the completion is being inserted
 * @param {string} name - The variable name to insert
 * @returns {string} Text to insert in place of the single `{` that triggered the completion
 */
const calculateSingleBraceInsertText = (textAfterCursor, name) => {
  const closersToAdd = countMissingClosingBraces(textAfterCursor);

  return `{${name}${'}'.repeat(closersToAdd)}`;
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
  const isApiHint = HINT_ROOTS.some(
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
 * @param {Object} options - Configuration options. options.enableSingleBraceTrigger gates
 *   the single-`{` trigger check below (only on for the surfaces that pass
 *   enableSingleBraceTrigger — URL bar, query/path params, headers, auth fields).
 * @returns {Object|null} Word information with context or null
 */
const getCurrentWordWithContext = (cm, options = {}) => {
  const cursor = cm.getCursor();
  const currentLine = cm.getLine(cursor.line);
  const currentString = cm.getRange({ line: cursor.line, ch: 0 }, cursor);

  // Check for variable pattern {{word
  const variableMatch = currentString.match(VARIABLE_PATTERN);
  if (variableMatch) {
    const wordMatch = variableMatch[1];

    // Ignore 3+ consecutive "{" characters to prevent reopening the dropdown
    // with an empty match.
    if (wordMatch === '' && currentString.match(/\{+$/)[0].length > 2) {
      return null;
    }

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

  // Check for the single-`{` trigger
  if (options.enableSingleBraceTrigger && SINGLE_BRACE_PATTERN.test(currentString)) {
    return {
      word: '',
      from: cursor,
      to: cursor,
      context: 'variables',
      requiresBraces: true,
      isSingleBrace: true
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
 * @param {Object} [variableScopes] - name -> scope map.
 * @returns {string[]} Array of suggestion segments
 */
const extractNextSegmentSuggestions = (filteredHints, currentInput, variableScopes = {}) => {
  const prefixMatches = new Set();
  const substringMatches = new Set();
  const lowerInput = currentInput.toLowerCase();

  filteredHints.forEach((hint) => {
    const lowerHint = hint.toLowerCase();
    const scope = variableScopes[hint];
    const isAtomicVariableName = !!scope && scope !== 'process.env';

    // For prefix matches, use the original progressive logic
    if (lowerHint.startsWith(lowerInput)) {
      if (isAtomicVariableName) {
        prefixMatches.add(hint);
        return;
      }

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
  // within each, group by scope and sort alphabetically within a scope.
  return [
    ...Array.from(prefixMatches).sort((a, b) => compareHintsByScope(a, b, variableScopes)),
    ...Array.from(substringMatches).sort((a, b) => compareHintsByScope(a, b, variableScopes))
  ];
};

/**
 * Extract the relevant part of hints based on user input
 * @param {string[]} filteredHints - Pre-filtered hints
 * @param {string} currentInput - Current user input
 * @param {Object} [variableScopes] - name -> scope map
 * @returns {string[]} Array of hint parts
 */
const getHintParts = (filteredHints, currentInput, variableScopes = {}) => {
  if (!filteredHints || filteredHints.length === 0) {
    return [];
  }

  return extractNextSegmentSuggestions(filteredHints, currentInput, variableScopes);
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
    const hasApiHints = showHintsFor.some((group) => HINT_GROUPS.includes(group));
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
 * @param {Object} [options] - Filtering options
 * @param {boolean} [options.allowEmptyWord] - When true, single `{` can trigger the hints
 * @returns {string[]} Filtered hints
 */
const filterHintsByContext = (categorizedHints, currentWord, context, showHintsFor = [], { allowEmptyWord = false } = {}) => {
  if (!currentWord && !allowEmptyWord) {
    return [];
  }

  const allowedHints = getAllowedHintsByContext(categorizedHints, context, showHintsFor);

  const word = currentWord || '';
  const lowerWord = word.toLowerCase();
  const filtered = allowedHints.filter((hint) => {
    return hint.toLowerCase().includes(lowerWord);
  });

  // Only the `variables` category ever has real scope info -- pass it through only
  // there, so the atomic-name bypass and the scope-based grouping in
  // extractNextSegmentSuggestions can never affect the `api`/`anyword` categories,
  // even by coincidence.
  const atomicNameScopes = context === 'variables' ? categorizedHints.variableScopes || {} : {};
  const hintParts = getHintParts(filtered, word, atomicNameScopes);

  // extractNextSegmentSuggestions already grouped hintParts by scope (then
  // alphabetically) within each of its prefix-match / substring-match buckets, so
  // there's nothing left to re-sort here.
  return hintParts.slice(0, 50);
};

// truncate after this length
const MAX_HINT_LABEL_CHARS = 46;

/**
 * @param {string} text - The full hint label
 * @returns {string} `text` unchanged if it already fits, otherwise cut down
 *   and suffixed with a literal "..." so a truncated name is unambiguous.
 */
const truncateHintLabel = (text) => {
  if (!text || text.length <= MAX_HINT_LABEL_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_HINT_LABEL_CHARS - 3)}...`;
};

/**
 * @param {HTMLLIElement} li - hint's list item element, provided by CodeMirror
 * @param {Object} self - show-hint widget instance (unused here)
 * @param {Object} completion - hint object being rendered (text/displayText/scope)
 */
const renderVariableHint = (li, self, completion) => {
  const icon = document.createElement('span');
  const colorClass = SCOPE_ICON_COLOR_CLASS[completion.scope] || 'muted';
  icon.className = `CodeMirror-hint-variable-icon CodeMirror-hint-variable-icon-${colorClass}`;
  icon.innerHTML = SCOPE_ICON[completion.scope] || '';

  const fullName = completion.displayText;
  const label = document.createElement('span');
  label.className = 'CodeMirror-hint-variable-name';
  label.textContent = truncateHintLabel(fullName);
  label.title = fullName;

  li.innerHTML = '';
  li.classList.add('CodeMirror-hint-variable');
  li.appendChild(icon);
  li.appendChild(label);
  li.title = SCOPE_LABEL[completion.scope] || '';
};

/**
 * Create hint list for variables context
 * @param {string[]} filteredHints - Filtered hints
 * @param {Object} from - Start position
 * @param {Object} to - End position
 * @param {Object} variableScopes - name to scope map
 * @param {string} [textAfterCursor] - characters already exist on the line right after the cursor
 * @returns {Object} Hint object with list and positions
 */
const createVariableHintList = (filteredHints, from, to, variableScopes = {}, textAfterCursor = '') => {
  const closingSuffix = '}'.repeat(countMissingClosingBraces(textAfterCursor));

  const hintList = filteredHints.map((hint) => {
    const scope = variableScopes[hint];
    if (!scope && isProcessEnvDrillDownPrefix(hint)) {
      return { text: hint, displayText: hint, scope: 'process.env', render: renderVariableHint };
    }
    if (!scope || !SCOPE_ICON[scope]) {
      return { text: hint, displayText: hint };
    }
    return {
      text: `${hint}${closingSuffix}`,
      displayText: hint,
      scope,
      render: renderVariableHint
    };
  });

  return {
    list: hintList,
    from,
    to
  };
};

/**
 * Create hint list for the single-`{` trigger context.
 *
 * @param {string[]} filteredHints - Filtered hints
 * @param {Object} from - Start position, the triggering `{` itself
 * @param {Object} to - End position
 * @param {Object} variableScopes - name to scope map
 * @param {string} textAfterCursor - The line's content starting at the cursor
 * @returns {Object} Hint object with list and positions
 */
const createSingleBraceVariableHintList = (filteredHints, from, to, variableScopes = {}, textAfterCursor = '') => {
  const hintList = filteredHints.map((hint) => {
    const scope = variableScopes[hint];
    if (!scope && isProcessEnvDrillDownPrefix(hint)) {
      return { text: `{${hint}`, displayText: hint, scope: 'process.env', render: renderVariableHint };
    }
    if (!scope || !SCOPE_ICON[scope]) {
      return { text: `{${hint}`, displayText: hint };
    }
    return {
      text: calculateSingleBraceInsertText(textAfterCursor, hint),
      displayText: hint,
      scope,
      render: renderVariableHint
    };
  });

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

  const hints = HINT_ROOTS.filter((root) => showHintsFor.includes(root));

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

  const wordInfo = getCurrentWordWithContext(cm, options);
  if (!wordInfo) {
    return null;
  }

  const { word, from, to, context, requiresBraces, isSingleBrace } = wordInfo;
  const showHintsFor = options.showHintsFor || [];

  // Check if this context requires braces but we're not in a brace context
  if (context === 'variables' && !requiresBraces) {
    return null;
  }

  const categorizedHints = buildCategorizedHintsList(allVariables, anywordAutocompleteHints, options);

  const allowEmptyWord = context === 'variables' && !!options.enableSingleBraceTrigger;
  const filteredHints = filterHintsByContext(categorizedHints, word, context, showHintsFor, { allowEmptyWord });

  if (filteredHints.length === 0) {
    return null;
  }

  if (context === 'variables') {
    const cursor = cm.getCursor();
    const textAfterCursor = cm.getLine(cursor.line).slice(cursor.ch);

    if (isSingleBrace) {
      return createSingleBraceVariableHintList(filteredHints, from, to, categorizedHints.variableScopes, textAfterCursor);
    }
    return createVariableHintList(filteredHints, from, to, categorizedHints.variableScopes, textAfterCursor);
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
  const hasApiHints = showHintsFor.some((group) => HINT_GROUPS.includes(group));
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

  const changeGeneration = cm.changeGeneration();
  // Ctrl+Space shortcut fires our manual trigger on keydown, but releasing those two physical keys
  // fires the keyup event. Skip for those.
  if (changeGeneration === cm._brunoLastAutocompleteChangeGeneration) {
    return;
  }
  cm._brunoLastAutocompleteChangeGeneration = changeGeneration;

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
 * Manually (re)trigger autocomplete at the current caret position. invoked by the
 * Ctrl+Space shortcut (HotkeysProvider).
 *
 * @param {Object} cm - CodeMirror editor instance
 * @param {Object} options - The same options object passed to setupAutoComplete
 */

const TRIGGER_CLOSE_CHARACTERS = /[\s()\[\];:>,]/;

const triggerAutocompleteAtCaret = (cm, options = {}) => {
  const allVariables = options.getAllVariables?.() || {};
  const anywordAutocompleteHints = options.getAnywordAutocompleteHints?.() || [];

  // for shortcuts force enableSingleBraceTrigger.
  const forcedOptions = { ...options, enableSingleBraceTrigger: true };

  const existingHints = getAutoCompleteHints(cm, allVariables, anywordAutocompleteHints, forcedOptions);
  if (existingHints) {
    cm.showHint({
      hint: () => existingHints,
      completeSingle: false,
      closeCharacters: TRIGGER_CLOSE_CHARACTERS
    });

    cm._brunoLastAutocompleteChangeGeneration = cm.changeGeneration();
    return;
  }

  const showHintsFor = options.showHintsFor || [];
  if (!showHintsFor.includes('variables')) {
    return;
  }

  const cursor = cm.getCursor();
  cm.replaceRange('{{', cursor, cursor);
  // Explicit, rather than relying on CodeMirror's own post-insert cursor placement.
  cm.setCursor({ line: cursor.line, ch: cursor.ch + 2 });

  const hints = getAutoCompleteHints(cm, allVariables, anywordAutocompleteHints, forcedOptions);
  if (hints) {
    cm.showHint({
      hint: () => hints,
      completeSingle: false,
      closeCharacters: TRIGGER_CLOSE_CHARACTERS
    });

    cm._brunoLastAutocompleteChangeGeneration = cm.changeGeneration();
  }
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

  // Manual trigger, invoked by the global Ctrl+Space shortcut (HotkeysProvider).
  editor.brunoTriggerAutocomplete = () => triggerAutocompleteAtCaret(editor, options);

  return () => {
    editor.off('keyup', keyupHandler);
    if (options.showHintsOnClick) {
      editor.off('mousedown', clickHandler);
    }
    delete editor.brunoTriggerAutocomplete;
  };
};

// Exported for testing
export { extractNextSegmentSuggestions, WORD_PATTERN, calculateSingleBraceInsertText, truncateHintLabel, renderVariableHint };

// Initialize autocomplete command if not already present
if (!CodeMirror.commands.autocomplete) {
  CodeMirror.commands.autocomplete = (cm, hint, options) => {
    cm.showHint({ hint, ...options });
  };
}
