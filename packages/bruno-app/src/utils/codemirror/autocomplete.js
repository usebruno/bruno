import { mockDataFunctions } from '@usebruno/common';
import { AUTOCOMPLETE_SCOPES, AUTOCOMPLETE_TRIGGER, SCOPE_LABEL } from 'utils/common/constants';
import { SCOPE_ICON } from 'utils/codemirror/scopeIcons';
import { HINT_ROOTS, getApiEntries, getHintTexts, renderApiDoc } from 'utils/codemirror/scriptApi';

const CodeMirror = require('codemirror');

// Mock data functions - prefixed with $
const MOCK_DATA_HINTS = Object.keys(mockDataFunctions).map((key) => `$${key}`);

// Constants for word pattern matching.
// `-` is placed last so it is a literal hyphen, not a range operator — `$-/`
// would otherwise match `( ) % & ' * + ,`
const WORD_PATTERN = /[\w.$/-]/;
const VARIABLE_PATTERN = /\{\{([\w$.-]*)$/;
const SINGLE_BRACE_PATTERN = /\{$/;

/**
 * @param {Object} [options] - setupAutoComplete options
 * @returns {string} The field's AUTOCOMPLETE_TRIGGER mode. Callers that don't pass one (code editors,
 *   the variable popover) get `{{` only, never the single-`{` trigger.
 */
const getTriggerMode = (options = {}) => options.variableAutocomplete || AUTOCOMPLETE_TRIGGER.DOUBLE_BRACE;
// Rest of a variable name that sits after the cursor, e.g. `i.host` in `{{my.ap|i.host}}`
const NAME_TAIL_PATTERN = /^[\w$.-]*/;
const NON_CHARACTER_KEYS = /^(?!Shift|Tab|Enter|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Meta|Alt|Home|End\s)\w*/;

const VARIABLE_SCOPE_DISPLAY_ORDER = [
  AUTOCOMPLETE_SCOPES.GLOBAL,
  AUTOCOMPLETE_SCOPES.COLLECTION,
  AUTOCOMPLETE_SCOPES.ENVIRONMENT,
  AUTOCOMPLETE_SCOPES.FOLDER,
  AUTOCOMPLETE_SCOPES.REQUEST,
  AUTOCOMPLETE_SCOPES.RUNTIME,
  AUTOCOMPLETE_SCOPES.PROCESS_ENV,
  AUTOCOMPLETE_SCOPES.OAUTH2,
  AUTOCOMPLETE_SCOPES.DYNAMIC
];

/**
 * Rank a variable's scope for display grouping, per VARIABLE_SCOPE_DISPLAY_ORDER.
 * @param {string} [scope]
 * @returns {number}
 */
const getVariableScopeRank = (scope) => {
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
 * True for any path inside the process.env tree: `process`, `process.env`, `process.env.FOO`.
 * @param {string} hint
 * @returns {boolean}
 */
const isProcessEnvPath = (hint) => hint === 'process' || hint.startsWith('process.env');

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
 * @returns {{hints: string[], scopes: Object}} Hint names, and a name to scope map
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
 * @param {string} scriptType - The editor's script
 */
const addApiHintsToSet = (apiHints, showHintsFor, scriptType) => {
  getApiEntries(showHintsFor, scriptType).forEach((entry) => {
    getHintTexts(entry).forEach((hint) => {
      generateProgressiveHints(hint).forEach((h) => apiHints.add(h));
    });
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
    variableScopes[hint] = AUTOCOMPLETE_SCOPES.DYNAMIC;
    generateProgressiveHints(hint).forEach((h) => variableHints.add(h));
  });

  if (Array.isArray(allVariables)) {
    const scoped = transformScopedVariablesToHints(allVariables);
    Object.assign(variableScopes, scoped.scopes);

    scoped.hints.forEach((hint) => {
      // split into prefixes only for process.env, so that atomic variables like `api.host` are not truncated to `api`
      if (scoped.scopes[hint] === AUTOCOMPLETE_SCOPES.PROCESS_ENV) {
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
  addApiHintsToSet(categorizedHints.api, showHintsFor, options.scriptType);
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
 * @returns {string} Text to insert right after the `{` that triggered the completion (which stays); it starts with the second `{`
 */
const buildSingleBraceInsertText = (textAfterCursor, name) => {
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
 * @param {Object} options - Configuration options. options.variableAutocomplete (an
 *   AUTOCOMPLETE_TRIGGER value) gates the single-`{` trigger check below: only fields in
 *   SINGLE_BRACE mode get it.
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
  if (getTriggerMode(options) === AUTOCOMPLETE_TRIGGER.SINGLE_BRACE && SINGLE_BRACE_PATTERN.test(currentString)) {
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

  // `process.env.*` names are split into bare segments (`process`, `env`, `FOO`) that have no entry in
  // variableScopes, so remember their scope here to sort them under it (see compareHintsByScope).
  const hasScopes = Object.keys(variableScopes).length > 0;
  const segmentScopes = {};
  const markProcessEnvSegment = (segment) => {
    if (hasScopes) {
      segmentScopes[segment] = AUTOCOMPLETE_SCOPES.PROCESS_ENV;
    }
  };

  filteredHints.forEach((hint) => {
    const lowerHint = hint.toLowerCase();
    const scope = variableScopes[hint];
    const isAtomicVariableName = !!scope && scope !== AUTOCOMPLETE_SCOPES.PROCESS_ENV;
    const isProcessEnvHint = scope === AUTOCOMPLETE_SCOPES.PROCESS_ENV || (!scope && isProcessEnvPath(hint));

    // For prefix matches, use the original progressive logic
    if (lowerHint.startsWith(lowerInput)) {
      if (isAtomicVariableName) {
        prefixMatches.add(hint);
        return;
      }

      // Handle exact match case
      if (lowerHint === lowerInput) {
        const segment = hint.substring(hint.lastIndexOf('.') + 1);
        prefixMatches.add(segment);
        if (isProcessEnvHint) markProcessEnvSegment(segment);
        return;
      }

      const inputLength = currentInput.length;

      if (currentInput.endsWith('.')) {
        // Show next segment after the dot
        const afterDot = hint.substring(inputLength);
        const nextDot = afterDot.indexOf('.');
        const segment = nextDot === -1 ? afterDot : afterDot.substring(0, nextDot);
        prefixMatches.add(segment);
        if (isProcessEnvHint) markProcessEnvSegment(segment);
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
        if (isProcessEnvHint) markProcessEnvSegment(segment);
      }
    } else if (lowerHint.includes(lowerInput)) {
      // For substring matches (search within words), suggest the complete hint
      substringMatches.add(hint);
      if (isProcessEnvHint) markProcessEnvSegment(hint);
    }
  });

  // Return prefix matches first, then substring matches
  // within each, group by scope and sort alphabetically within a scope.
  const sortScopes = { ...segmentScopes, ...variableScopes };
  return [
    ...Array.from(prefixMatches).sort((a, b) => compareHintsByScope(a, b, sortScopes)),
    ...Array.from(substringMatches).sort((a, b) => compareHintsByScope(a, b, sortScopes))
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
    const hasApiHints = showHintsFor.some((group) => HINT_ROOTS.includes(group));
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

  // Only the `variables` category ever has scope info
  const atomicNameScopes = context === 'variables' ? categorizedHints.variableScopes || {} : {};
  const hintParts = getHintParts(filtered, word, atomicNameScopes);

  return hintParts.slice(0, 50);
};

/**
 * @param {HTMLLIElement} li - hint's list item element, provided by CodeMirror
 * @param {Object} self - show-hint widget instance (unused here)
 * @param {Object} completion - hint object being rendered (text/displayText/scope)
 */
const renderVariableHint = (li, self, completion) => {
  const icon = document.createElement('span');
  icon.className = 'CodeMirror-hint-variable-icon';
  // The icon's colour is picked by this attribute in globalStyles.js.
  icon.setAttribute('data-scope', completion.scope || '');
  icon.setAttribute('data-testid', 'autocomplete-variable-icon');
  icon.innerHTML = SCOPE_ICON[completion.scope] || '';

  const fullName = completion.displayText;
  const label = document.createElement('span');
  label.className = 'CodeMirror-hint-variable-name';
  label.setAttribute('data-testid', 'autocomplete-variable-name');
  label.textContent = fullName;
  // Show the full name on hover only when the label is cut off
  label.addEventListener('mouseenter', () => {
    // An empty title would also hide the row-level scope tooltip, so remove the attribute instead
    if (label.scrollWidth > label.clientWidth) {
      label.title = fullName;
    } else {
      label.removeAttribute('title');
    }
  });

  li.innerHTML = '';
  li.classList.add('CodeMirror-hint-variable');
  li.setAttribute('data-testid', 'autocomplete-variable-item');
  li.appendChild(icon);
  li.appendChild(label);
  li.title = SCOPE_LABEL[completion.scope] || '';
};

/**
 * Creates an autocomplete hint for a segment of a `process.env` variable.
 *
 * Unlike other variable scopes, `process.env` is suggested one segment at a time:
 * `process` -> `env` -> `FOO`.
 *
 * Because intermediate segments like `process` and `process.env` aren't actual variables,
 * they don't have their own entries in `variableScopes`. We use the full path
 * (the typed prefix + the current hint) to figure out whether this is a `process.env` hint.
 *
 * @param {string} hint - The segment being suggested, e.g. `FOO`
 * @param {string} pathPrefix - The path typed so far, including the last dot, e.g. `process.env.`
 * @param {Object} variableScopes - Maps variable names to their scopes
 * @param {string} closingBraces - Any closing braces that still need to be added after a final name
 * @returns {Object|null} The hint object, or null if this isn't part of a `process.env` path
 */
const createProcessEnvSegmentHint = (hint, pathPrefix, variableScopes, closingBraces) => {
  const fullPath = `${pathPrefix}${hint}`;

  // This is an actual environment variable, e.g. `process.env.FOO`.
  // Complete it and add any missing closing braces.
  if (variableScopes[fullPath] === AUTOCOMPLETE_SCOPES.PROCESS_ENV) {
    return { text: `${hint}${closingBraces}`, displayText: hint, scope: AUTOCOMPLETE_SCOPES.PROCESS_ENV, render: renderVariableHint };
  }

  // `process` and `process.env` are just intermediate parts of the path.
  // Don't add closing braces, add the dot and keep the list open for the next segment.
  if (isProcessEnvPath(fullPath)) {
    return {
      text: `${hint}.`,
      displayText: hint,
      scope: AUTOCOMPLETE_SCOPES.PROCESS_ENV,
      render: renderVariableHint,
      hasMoreSegments: true
    };
  }

  return null;
};

/**
 * Create hint list for variables context
 * @param {string[]} filteredHints - Filtered hints
 * @param {Object} from - Start position
 * @param {Object} to - End position
 * @param {Object} variableScopes - name to scope map
 * @param {string} [textAfterCursor] - characters already exist on the line right after the cursor
 * @param {string} [word] - Text typed after `{{`; a hint containing it replaces the whole word
 * @returns {Object} Hint object with list and positions
 */
const createVariableHintList = (filteredHints, from, to, variableScopes = {}, textAfterCursor = '', word = '') => {
  const closingBracesAtCursor = '}'.repeat(countMissingClosingBraces(textAfterCursor));

  const wordStart = { line: to.line, ch: to.ch - word.length };

  // When the cursor is inside a variable (e.g. `{{my.ap|i.host}}`), replace the
  // remaining name to avoid leaving trailing characters behind.
  // Only replace names followed by `}}`; otherwise, leave the text untouched.

  const remainingName = textAfterCursor.match(NAME_TAIL_PATTERN)[0];
  const hasClosingBraces = textAfterCursor.startsWith('}}', remainingName.length);
  const nameToReplace = hasClosingBraces ? remainingName : '';

  const replaceEnd = { line: to.line, ch: to.ch + nameToReplace.length };

  // Counted after the replaced name: only braces that follow the name being overwritten are reusable.
  const closingBracesAfterName = '}'.repeat(countMissingClosingBraces(textAfterCursor.slice(nameToReplace.length)));

  const lowerWord = word.toLowerCase();
  const containsWord = (name) => name.toLowerCase().includes(lowerWord);

  const pathPrefix = word.slice(0, word.lastIndexOf('.') + 1);

  const hintList = filteredHints.map((hint) => {
    const scope = variableScopes[hint];

    if (!scope) {
      const processEnvHint = createProcessEnvSegmentHint(hint, pathPrefix, variableScopes, closingBracesAfterName);
      if (processEnvHint) {
        processEnvHint.from = from;
        processEnvHint.to = replaceEnd;
        return processEnvHint;
      }
    }

    if (!scope || !SCOPE_ICON[scope]) {
      return { text: hint, displayText: hint };
    }

    const hintObject = {
      text: `${hint}${closingBracesAtCursor}`,
      displayText: hint,
      scope,
      render: renderVariableHint
    };

    // If the current word is a substring of the hint, replace the entire word with the hint.
    if (containsWord(hint)) {
      hintObject.text = `${hint}${closingBracesAfterName}`;
      hintObject.from = wordStart;
      hintObject.to = replaceEnd;
    }

    return hintObject;
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
    if (!scope && isProcessEnvPath(hint)) {
      return {
        text: `{${hint}.`,
        displayText: hint,
        scope: AUTOCOMPLETE_SCOPES.PROCESS_ENV,
        render: renderVariableHint,
        hasMoreSegments: true
      };
    }
    if (!scope || !SCOPE_ICON[scope]) {
      return { text: `{${hint}`, displayText: hint };
    }
    return {
      text: buildSingleBraceInsertText(textAfterCursor, hint),
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
 * @param {string} scriptType - The editor's script
 * @returns {Object} Hint object with list and positions
 */
const createApiHintList = (filteredHints, word, from, to, showHintsFor, scriptType) => {
  const entriesByHint = new Map(
    getApiEntries(showHintsFor, scriptType).flatMap((entry) => getHintTexts(entry).map((hint) => [hint, entry]))
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
 * @param {Object|Array<{name: string, scope: string}>} allVariables - All available variables: a plain
 *   `{ name: value }` object (no scope info, e.g. the inline variable-value editor in brunoVarInfo.js) or an array of
 *   `{ name, scope }` entries (the request editors, which show a scope icon per hint)
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

  // OFF: typing never opens the variable list (the Trigger Autocomplete shortcut forces SINGLE_BRACE, so it still does)
  if (context === 'variables' && getTriggerMode(options) === AUTOCOMPLETE_TRIGGER.OFF) {
    return null;
  }

  const categorizedHints = buildCategorizedHintsList(allVariables, anywordAutocompleteHints, options);

  // `{{` opens the list straight away, before any name is typed
  const allowEmptyWord = context === 'variables';
  const filteredHints = filterHintsByContext(categorizedHints, word, context, showHintsFor, { allowEmptyWord });

  if (filteredHints.length === 0) {
    return null;
  }

  if (context === 'variables') {
    const cursor = cm.getCursor();
    const textAfterCursor = cm.getLine(cursor.line).slice(cursor.ch);

    const hintList = isSingleBrace
      ? createSingleBraceVariableHintList(filteredHints, from, to, categorizedHints.variableScopes, textAfterCursor)
      : createVariableHintList(filteredHints, from, to, categorizedHints.variableScopes, textAfterCursor, word);

    // Reopen autocomplete for incomplete variable names (e.g. `process` → `process.`)
    // so users can continue selecting the next segment.
    CodeMirror.on(hintList, 'pick', (completion) => {
      if (!completion.hasMoreSegments) {
        return;
      }

      // Preserve the current popup's closing characters.
      const closeCharacters = cm.state.completionActive?.options.closeCharacters;

      // Wait for show-hint to close the current popup before opening the next one.
      setTimeout(() => {
        const nextHints = getAutoCompleteHints(cm, allVariables, anywordAutocompleteHints, options);
        if (!nextHints) {
          return;
        }

        cm.showHint({ hint: () => nextHints, completeSingle: false, closeCharacters });

        // Prevent the keyup handler from reopening autocomplete for the same change.
        cm._brunoLastAutocompleteChangeGeneration = cm.changeGeneration();
      }, 0);
    });

    return hintList;
  }

  if (context === 'api') {
    return createApiHintList(filteredHints, word, from, to, showHintsFor, options.scriptType);
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
  const hasApiHints = showHintsFor.some((group) => HINT_ROOTS.includes(group));
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
      hint: () => createApiHintList(allHints, '', cursor, cursor, showHintsFor, options.scriptType),
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
  // The Trigger Autocomplete shortcut fires our manual trigger on keydown, but releasing its two physical
  // keys fires the keyup event. Skip for those.
  if (changeGeneration === cm._brunoLastAutocompleteChangeGeneration) {
    return;
  }
  cm._brunoLastAutocompleteChangeGeneration = changeGeneration;

  const allVariables = options.getAllVariables?.() || {};
  const anywordAutocompleteHints = options.getAnywordAutocompleteHints?.() || [];
  const hints = getAutoCompleteHints(cm, allVariables, anywordAutocompleteHints, options);

  if (!hints) {
    const wordInfo = getCurrentWordWithContext(cm, options);
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

const TRIGGER_CLOSE_CHARACTERS = /[\s()\[\];:>,]/;

/**
 * Manually (re)trigger autocomplete at the current caret position. invoked by the
 * Trigger Autocomplete shortcut (HotkeysProvider): Option+Space on macOS, Ctrl+Space elsewhere.
 *
 * @param {Object} cm - CodeMirror editor instance
 * @param {Object} options - The same options object passed to setupAutoComplete
 */
const triggerAutocompleteAtCaret = (cm, options = {}) => {
  if (cm.getOption('readOnly')) {
    return;
  }

  const allVariables = options.getAllVariables?.() || {};
  const anywordAutocompleteHints = options.getAnywordAutocompleteHints?.() || [];

  // the manual shortcut works in every mode, including OFF
  const forcedOptions = { ...options, variableAutocomplete: AUTOCOMPLETE_TRIGGER.SINGLE_BRACE };

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
  let hints = null;

  // One operation, so the insert and a possible rollback are a single undo step.
  cm.operation(() => {
    cm.replaceRange('{{', cursor, cursor);
    // Explicit, rather than relying on CodeMirror's own post-insert cursor placement.
    cm.setCursor({ line: cursor.line, ch: cursor.ch + 2 });

    hints = getAutoCompleteHints(cm, allVariables, anywordAutocompleteHints, forcedOptions);
    if (!hints) {
      cm.replaceRange('', cursor, { line: cursor.line, ch: cursor.ch + 2 });
      cm.setCursor(cursor);
    }
  });

  if (!hints) {
    return;
  }

  cm.showHint({
    hint: () => hints,
    completeSingle: false,
    closeCharacters: TRIGGER_CLOSE_CHARACTERS
  });

  cm._brunoLastAutocompleteChangeGeneration = cm.changeGeneration();
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

  const keydownHandler = (cm, event) => {
    if (event.key === 'Escape' && cm.state.completionActive) {
      event.stopPropagation();
      cm.state.completionActive.close();
    }
  };

  editor.on('keydown', keydownHandler);

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

  // Manual trigger, invoked by the global Trigger Autocomplete shortcut (HotkeysProvider).
  editor.brunoTriggerAutocomplete = () => triggerAutocompleteAtCaret(editor, options);

  return () => {
    editor.off('keyup', keyupHandler);
    editor.off('keydown', keydownHandler);
    if (options.showHintsOnClick) {
      editor.off('mousedown', clickHandler);
    }
    delete editor.brunoTriggerAutocomplete;
  };
};

// Exported for testing
export { extractNextSegmentSuggestions, WORD_PATTERN, buildSingleBraceInsertText };

// Initialize autocomplete command if not already present
if (!CodeMirror.commands.autocomplete) {
  CodeMirror.commands.autocomplete = (cm, hint, options) => {
    cm.showHint({ hint, ...options });
  };
}
