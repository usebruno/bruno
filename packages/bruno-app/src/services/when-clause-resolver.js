/**
 * WhenClauseResolver - Evaluates when clauses for context-aware shortcuts
 * This follows VSCode's when clause context pattern
 * Using functional approach with module-level state
 */

// Module-level state
const contextProviders = {};
let _activeTabType = null;
let _sidebarVisible = true;
let _sidebarItemFocused = false;
let _requestIsDirty = false;
let _tabsCount = 0;

/**
 * Register a context provider
 * @param {string} contextName - Name of the context (e.g., 'editorTextFocus')
 * @param {Function} provider - Function that returns the context value
 */
const registerContext = (contextName, provider) => {
  contextProviders[contextName] = provider;
};

/**
 * Evaluate a when clause
 * @param {string} whenClause - The when clause to evaluate (e.g., '!editorTextFocus && activeTabIsRequest')
 * @returns {boolean} Whether the clause is true
 */
const evaluate = (whenClause) => {
  if (!whenClause || whenClause === 'always') {
    return true;
  }

  try {
    // Handle logical operators: &&, ||
    // Handle negation: !

    // Handle OR operator
    if (whenClause.includes('||')) {
      const parts = whenClause.split('||').map((p) => p.trim());
      return parts.some((part) => evaluateCondition(part));
    }

    // Handle AND operator
    if (whenClause.includes('&&')) {
      const parts = whenClause.split('&&').map((p) => p.trim());
      return parts.every((part) => evaluateCondition(part));
    }

    // Single condition
    return evaluateCondition(whenClause);
  } catch (error) {
    console.error('Error evaluating when clause:', whenClause, error);
    return true; // Default to true if evaluation fails
  }
};

/**
 * Evaluate a single condition (without && or ||)
 * @param {string} condition - The condition to evaluate
 * @returns {boolean}
 */
const evaluateCondition = (condition) => {
  const trimmed = condition.trim();

  // Handle negation
  if (trimmed.startsWith('!')) {
    const innerCondition = trimmed.substring(1).trim();
    return !evaluateCondition(innerCondition);
  }

  // Get the context value
  const provider = contextProviders[trimmed];
  if (provider) {
    return !!provider();
  }

  // If context not found, log warning and return true
  console.warn(`WhenClauseResolver: Unknown context "${trimmed}"`);
  return true;
};

/**
 * Get all available contexts
 * @returns {string[]} Array of context names
 */
const getAvailableContexts = () => {
  return Object.keys(contextProviders);
};

/**
 * Set active tab type for context evaluation
 * @param {string} type - The active tab type
 */
const setActiveTabType = (type) => {
  _activeTabType = type;
};

/**
 * Set sidebar visibility for context evaluation
 * @param {boolean} visible - Whether sidebar is visible
 */
const setSidebarVisible = (visible) => {
  _sidebarVisible = visible;
};

/**
 * Set sidebar item focused state for context evaluation
 * @param {boolean} focused - Whether a sidebar item is focused
 */
const setSidebarItemFocused = (focused) => {
  _sidebarItemFocused = focused;
};

/**
 * Set request dirty state for context evaluation
 * @param {boolean} dirty - Whether request has unsaved changes
 */
const setRequestIsDirty = (dirty) => {
  _requestIsDirty = dirty;
};

/**
 * Set the number of tabs for context evaluation
 * @param {number} count - Number of open tabs
 */
const setTabsCount = (count) => {
  _tabsCount = count;
};

// Register default contexts
registerContext('editorTextFocus', () => {
  return document.activeElement?.closest('.CodeMirror') !== null;
});

registerContext('editorHasSelection', () => {
  // This would need access to CodeMirror instance
  return false;
});

registerContext('activeTabIsRequest', () => {
  // Check for any request type (http, grpc, websocket, graphql)
  const requestTypes = ['request', 'grpc-request', 'ws-request', 'graphql-request'];
  return requestTypes.includes(_activeTabType);
});

registerContext('activeTabIsFolder', () => {
  return _activeTabType === 'folder-settings';
});

registerContext('activeTabIsEnvironment', () => {
  return _activeTabType === 'environment-settings';
});

registerContext('activeTabIsCollection', () => {
  return _activeTabType === 'collection-settings';
});

registerContext('isMac', () => {
  return navigator.platform.toLowerCase().includes('mac');
});

registerContext('sidebarVisible', () => {
  return _sidebarVisible !== false;
});

registerContext('sidebarItemFocused', () => {
  return _sidebarItemFocused === true;
});

registerContext('inModal', () => {
  // Check if any modal overlay is currently in the DOM
  return document.querySelector('.modal-overlay, [class*="modal"]') !== null;
});

registerContext('inPreferences', () => {
  return _activeTabType === 'preferences';
});

registerContext('requestIsDirty', () => {
  return _requestIsDirty === true;
});

registerContext('activeTabIsClosable', () => {
  // Tab is closable if there's an active tab and it's not a non-closable type
  const nonClosableTypes = ['workspaceOverview', 'workspaceEnvironments'];
  return _activeTabType !== null && !nonClosableTypes.includes(_activeTabType);
});

registerContext('activeTabExists', () => {
  return _activeTabType !== null;
});

registerContext('multipleTabsOpen', () => {
  return _tabsCount > 1;
});

registerContext('hasOpenTabs', () => {
  return _tabsCount > 0;
});

// Export as singleton object
const whenClauseResolver = {
  registerContext,
  evaluate,
  evaluateCondition,
  getAvailableContexts,
  setActiveTabType,
  setSidebarVisible,
  setSidebarItemFocused,
  setRequestIsDirty,
  setTabsCount
};

export default whenClauseResolver;
