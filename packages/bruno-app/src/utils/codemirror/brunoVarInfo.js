/**
 *  Copyright (c) 2017, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file at https://github.com/graphql/codemirror-graphql/tree/v0.8.3
 */

import { interpolate, mockDataFunctions, timeBasedDynamicVars } from '@usebruno/common';
import { toDisplayString } from '@usebruno/common/utils';
import toast from 'react-hot-toast';
import {
  getVariableScope,
  isVariableSecret,
  getAllVariables,
  findCollectionByUid,
  findItemInCollectionByItemUid,
  findParentItemInCollection,
  getAvailableAddToScopes
} from 'utils/collections';
import {
  updateVariableInScope,
  addEnvironment,
  selectEnvironment
} from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import store from 'providers/ReduxStore';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { MaskedEditor } from 'utils/common/masked-editor';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';
import { variableNameRegex, validateName, validateNameError } from 'utils/common/regex';
import { VARIABLE_ADD_SCOPES, SCOPE_ICON } from 'utils/common/constants';
import { createAddToScopeSwitcher } from 'utils/codemirror/addToScopeSwitcher';
import { goToVariableDefinition } from 'utils/codemirror/goToVariableDefinition';

let CodeMirror;
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;
const { get } = require('lodash');

const COPY_ICON_SVG_TEXT = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
`;

const CHECKMARK_ICON_SVG_TEXT = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20,6 9,17 4,12"></polyline>
</svg>
`;

const COPY_SUCCESS_COLOR = '#22c55e';

export const COPY_SUCCESS_TIMEOUT = 1000;

// Editor height constraints
const EDITOR_MIN_HEIGHT = 1.75;
const EDITOR_MAX_HEIGHT = 11.125;

/**
 * Calculate editor height based on content, clamped between min and max
 * @param {number} contentHeight - The actual content height from CodeMirror
 * @returns {number} The clamped height value
 */
const calculateEditorHeight = (contentHeight) => {
  const contentHeightRem = contentHeight / 16;
  return Math.min(Math.max(contentHeightRem, EDITOR_MIN_HEIGHT), EDITOR_MAX_HEIGHT);
};

const EYE_ICON_SVG = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
`;

const EYE_OFF_ICON_SVG = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
`;

const getScopeLabel = (scopeType) => {
  const labels = {
    'global': 'Global',
    'environment': 'Environment',
    'collection': 'Collection',
    'folder': 'Folder',
    'request': 'Request',
    'runtime': 'Runtime',
    'process.env': 'Process Env',
    'dynamic': 'Dynamic',
    'oauth2': 'OAuth2',
    'undefined': 'Undefined',
    'unresolved': 'New',
    'pathParam': 'Path Param'
  };
  return labels[scopeType] || scopeType;
};

const setScopeBadgeContent = (scopeBadge, scopeType, label) => {
  scopeBadge.innerHTML = '';

  const scopeIcon = SCOPE_ICON[scopeType];
  if (scopeIcon) {
    const icon = document.createElement('span');
    icon.className = 'var-scope-badge-icon';
    icon.innerHTML = scopeIcon;
    scopeBadge.appendChild(icon);
  }

  const labelSpan = document.createElement('span');
  labelSpan.className = 'var-scope-badge-label';
  labelSpan.textContent = label;
  scopeBadge.appendChild(labelSpan);
};

const NEW_ENVIRONMENT_WAIT_TIMEOUT_MS = 3000;

// `addEnvironment` only writes the file through IPC. The store is updated later, once the
// filesystem watcher picks up the new file and dispatches it in.
// subscribe to the store and resolve on the exact dispatch that adds it
const waitForEnvironmentByName = (collectionUid, name) => {
  const findEnvironment = () => {
    const freshCollection = findCollectionByUid(store.getState().collections.collections, collectionUid);
    return (freshCollection?.environments || []).find((env) => env.name === name);
  };

  return new Promise((resolve, reject) => {
  // check if the environment already exists in the store (in case it was created before this function was called)
    const existing = findEnvironment();
    if (existing) {
      return resolve(existing);
    }

    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Failed to create environment "${name}"`));
    }, NEW_ENVIRONMENT_WAIT_TIMEOUT_MS);

    const unsubscribe = store.subscribe(() => {
      const found = findEnvironment();
      if (found) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(found);
      }
    });
  });
};

// Get the masked display text based on the value length
const getMaskedDisplay = (value) => {
  const contentLength = (value === undefined || value === null ? '' : String(value)).length;
  return contentLength > 0 ? '*'.repeat(contentLength) : '';
};

// Update the value display based on the secret and masked state
const updateValueDisplay = (valueDisplay, value, isSecret, isMasked, isRevealed) => {
  if ((isSecret || isMasked) && !isRevealed) {
    valueDisplay.textContent = getMaskedDisplay(value);
    return;
  }

  if (typeof value === 'object') {
    valueDisplay.textContent = value === null ? 'null' : toDisplayString(value, String(value));
    return;
  }

  if (typeof value === 'undefined' || value === undefined) {
    valueDisplay.textContent = '';
    return;
  }

  valueDisplay.textContent = value;
};

// Check if the raw value contains references to secret variables
const containsSecretVariableReferences = (rawValue, collection, item) => {
  if (!rawValue || typeof rawValue !== 'string') {
    return false;
  }

  // Match all variable references like {{varName}}
  const variableReferencePattern = /\{\{([^}]+)\}\}/g;
  const matches = rawValue.matchAll(variableReferencePattern);

  for (const match of matches) {
    const referencedVarName = match[1].trim();

    // Get scope info for the referenced variable
    const referencedScopeInfo = getVariableScope(referencedVarName, collection, item);

    // Check if the referenced variable is a secret
    if (referencedScopeInfo && isVariableSecret(referencedScopeInfo)) {
      return true;
    }
  }

  return false;
};

const getCopyButton = (getVariableValue, onCopyCallback) => {
  const copyButton = document.createElement('button');

  copyButton.className = 'copy-button';
  copyButton.setAttribute('data-testid', 'var-info-copy-button');
  copyButton.innerHTML = COPY_ICON_SVG_TEXT;
  copyButton.type = 'button';

  let isCopied = false;

  copyButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  copyButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Prevent clicking if showing success checkmark
    if (isCopied) {
      return;
    }

    // Resolve the latest value at click time so edits/saves are reflected.
    const valueToCopy = typeof getVariableValue === 'function' ? getVariableValue() : getVariableValue;

    const valueStr = toDisplayString(valueToCopy, String(valueToCopy));

    navigator.clipboard
      .writeText(valueStr)
      .then(() => {
        isCopied = true;
        copyButton.innerHTML = CHECKMARK_ICON_SVG_TEXT;
        copyButton.style.color = COPY_SUCCESS_COLOR;
        copyButton.style.cursor = 'default';
        copyButton.classList.add('copy-success');

        setTimeout(() => {
          isCopied = false;
          copyButton.innerHTML = COPY_ICON_SVG_TEXT;
          copyButton.style.color = '#989898';
          copyButton.style.cursor = 'pointer';
          copyButton.classList.remove('copy-success');
        }, COPY_SUCCESS_TIMEOUT);

        // Call callback if provided
        if (onCopyCallback) {
          onCopyCallback();
        }
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err.message);
      });
  });

  return copyButton;
};

export const renderVarInfo = (token, options) => {
  // Extract variable name and value based on token
  const { variableName, variableValue } = extractVariableInfo(token.string, options.variables);

  // Don't show popover if we can't extract a variable name or if it's empty/whitespace
  if (!variableName || !variableName.trim()) {
    return;
  }

  const collection = options.collection;
  const item = options.item;

  // Check if this is a dynamic/faker variable (starts with "$")
  let scopeInfo;
  if (variableName.startsWith('$oauth2.')) {
    // OAuth2 token variable - look up in variables object
    const oauth2Value = get(options.variables, variableName);
    scopeInfo = {
      type: 'oauth2',
      value: oauth2Value !== undefined ? oauth2Value : '',
      data: null,
      isValidOAuth2Variable: oauth2Value !== undefined
    };
  } else if (variableName.startsWith('$')) {
    const fakerKeyword = variableName.substring(1); // Remove the $ prefix
    const fakerFunction = mockDataFunctions[fakerKeyword];
    const isTimeBased = timeBasedDynamicVars.has(fakerKeyword);
    scopeInfo = {
      type: 'dynamic',
      value: '',
      data: null,
      isValidDynamicVariable: !!fakerFunction,
      isTimeBased
    };
  } else if (variableName.startsWith('process.env.')) {
    // Check if this is a process.env variable (starts with "process.env.")
    scopeInfo = {
      type: 'process.env',
      value: variableValue || '',
      data: null
    };
  } else if (token.string.startsWith('/:')) {
    scopeInfo = {
      type: 'pathParam',
      value: variableValue || '',
      data: { item }
    };
  } else {
    // Detect variable scope
    scopeInfo = getVariableScope(variableName, collection, item);

    // If variable doesn't exist in any scope, determine scope based on context
    if (!scopeInfo) {
      if (item && item.uid) {
        // Determine if item is a folder or request
        const isFolder = item.type === 'folder';

        if (isFolder) {
          // We're in folder settings - create as folder variable
          scopeInfo = {
            type: 'folder',
            value: '', // Empty value for new variable
            data: { folder: item, variable: null } // variable is null since it doesn't exist yet
          };
        } else {
          // We're in a request - create as request variable
          scopeInfo = {
            type: 'request',
            value: '', // Empty value for new variable
            data: { item, variable: null } // variable is null since it doesn't exist yet
          };
        }
      } else if (collection?.uid) {
        scopeInfo = {
          type: 'collection',
          value: '',
          data: { collection, variable: null }
        };
      } else if (collection) {
        // We're in the Global Environment table (no collection context).
        // for global env colelction is {} without uid.
        // Pass as "unresolved" so that the Add-to switcher can resolve to the first available scope.
        scopeInfo = {
          type: 'unresolved',
          value: '',
          data: { variable: null }
        };
      } else {
        // No context at all (no collection, no item) - nothing to add to, show as undefined.
        scopeInfo = {
          type: 'undefined',
          value: '',
          data: null
        };
      }
    }
  }

  // Check if a runtime variable exists with the same name (even if scope is detected as collection/folder/environment)
  const hasRuntimeVariable = collection && collection.runtimeVariables && collection.runtimeVariables[variableName];
  // Check if variable is read-only (process.env, runtime, dynamic/faker, oauth2, and undefined variables cannot be edited)
  const isReadOnly = scopeInfo.type === 'process.env' || scopeInfo.type === 'runtime' || scopeInfo.type === 'dynamic' || scopeInfo.type === 'oauth2' || scopeInfo.type === 'undefined' || hasRuntimeVariable;

  // `??` preserves typed falsy values (false / 0); `||` would clobber them to ''.
  const rawValue = scopeInfo.value ?? '';

  // Check if variable should be masked:
  const isSecret = scopeInfo.type !== 'undefined' ? isVariableSecret(scopeInfo) : false;
  const hasSecretReferences = containsSecretVariableReferences(rawValue, collection, item);
  const shouldMaskValue = isSecret || hasSecretReferences;

  const isMasked = options.variables?.maskedEnvVariables?.includes(variableName);

  const into = document.createElement('div');
  into.className = 'bruno-var-info-container';

  // Header: Variable name + Scope badge
  const header = document.createElement('div');
  header.className = 'var-info-header';

  const varName = document.createElement('span');
  varName.className = 'var-name';
  varName.setAttribute('data-testid', 'var-info-name');
  varName.textContent = variableName;

  const scopeBadge = document.createElement('span');
  scopeBadge.className = 'var-scope-badge';
  scopeBadge.setAttribute('data-testid', 'var-info-scope-badge');

  // Check if a runtime variable exists - if so, show Runtime scope (even if detected as collection/folder/environment)
  const displayScopeType = hasRuntimeVariable ? 'runtime' : (scopeInfo ? scopeInfo.type : 'Unknown');
  const scopeLabel = getScopeLabel(displayScopeType);
  const isNewVariable = scopeInfo.data && scopeInfo.data.variable === null;

  const canGoToDefinition = !!collection && !isNewVariable && !hasRuntimeVariable && ['request', 'folder', 'collection', 'environment', 'global'].includes(scopeInfo.type);

  // If the variable is not new and has a valid scope, make the variable name clickable to go to its definition
  if (canGoToDefinition) {
    varName.classList.add('var-name-link');
    varName.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      goToVariableDefinition(scopeInfo, collection, item, variableName);

      // Close the tooltip once we've navigated to the definition.
      const popup = varName.closest('.CodeMirror-brunoVarInfo');
      if (popup && typeof popup._hidePopup === 'function') {
        popup._hidePopup({ immediate: true });
      }
    });
  }

  header.appendChild(varName);

  setScopeBadgeContent(scopeBadge, displayScopeType, scopeLabel);
  header.appendChild(scopeBadge);

  into.appendChild(header);

  // Check if variable name is valid
  const isValidVariableName = scopeInfo.type === 'process.env' || scopeInfo.type === 'dynamic' || scopeInfo.type === 'oauth2' || variableNameRegex.test(variableName);

  // Show warning if variable name is invalid
  if (!isValidVariableName) {
    const warningNote = document.createElement('div');
    warningNote.className = 'var-warning-note';
    warningNote.setAttribute('data-testid', 'var-info-warning-note');
    warningNote.textContent = 'Invalid variable name! Variables must only contain alpha-numeric characters, "-", "_", "."';
    into.appendChild(warningNote);

    // Don't show value or any other content for invalid variable names
    return into;
  }

  // Show warning for invalid dynamic variable (starts with $ but not a valid dynamic function)
  if (scopeInfo.type === 'dynamic' && !scopeInfo.isValidDynamicVariable) {
    const warningNote = document.createElement('div');
    warningNote.className = 'var-warning-note';
    warningNote.setAttribute('data-testid', 'var-info-warning-note');
    warningNote.textContent = `Unknown dynamic variable "${variableName}". Check the variable name.`;
    into.appendChild(warningNote);
    return into;
  }

  // For valid dynamic variables, show appropriate read-only note based on type
  if (scopeInfo.type === 'dynamic' && scopeInfo.isValidDynamicVariable) {
    const readOnlyNote = document.createElement('div');
    readOnlyNote.className = 'var-readonly-note';
    readOnlyNote.setAttribute('data-testid', 'var-info-readonly-note');
    readOnlyNote.textContent = scopeInfo.isTimeBased
      ? 'Generates current timestamp on each request'
      : 'Generates random value on each request';
    into.appendChild(readOnlyNote);
    return into;
  }

  // Show warning for invalid OAuth2 variable (token not found)
  if (scopeInfo.type === 'oauth2' && !scopeInfo.isValidOAuth2Variable) {
    const warningNote = document.createElement('div');
    warningNote.className = 'var-warning-note';
    warningNote.setAttribute('data-testid', 'var-info-warning-note');
    warningNote.textContent = `OAuth2 token not found. Make sure you have fetched the token with the correct Token ID.`;
    into.appendChild(warningNote);
    return into;
  }

  // Value container with icons
  const valueContainer = document.createElement('div');
  valueContainer.className = 'var-value-container';

  // Reads the Add-to switcher's pending Secret checkbox state, if a switcher is mounted.
  const getPendingSecret = () => (
    valueContainer._addToSwitcher && typeof valueContainer._addToSwitcher._getPendingSecret === 'function'
      ? valueContainer._addToSwitcher._getPendingSecret()
      : false
  );

  // Create editable value display/editor (if editable)
  if (!isReadOnly) {
    // Handle secret/masked variables state
    let isRevealed = false;

    // Create display element (shows interpolated value by default)
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'var-value-editable-display';
    valueDisplay.setAttribute('data-testid', 'var-info-value-editable');
    // Mask the displayed value if it contains secrets or references to secrets
    updateValueDisplay(valueDisplay, variableValue, shouldMaskValue, isMasked, false);

    // Create container for CodeMirror (hidden by default)
    const editorContainer = document.createElement('div');
    editorContainer.className = 'var-value-editor';
    editorContainer.setAttribute('data-testid', 'var-info-value-editor');
    editorContainer.style.display = 'none'; // Hidden initially

    // Detect current theme from DOM
    const isDarkTheme = document.documentElement.classList.contains('dark');
    const cmTheme = isDarkTheme ? 'monokai' : 'default';

    // Get all variables for syntax highlighting (but prevent recursive tooltips)
    const allVariables = collection ? getAllVariables(collection, item) : {};

    const editorInitialValue = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue, null, 2);

    const cmEditor = CodeMirror(editorContainer, {
      value: editorInitialValue,
      mode: 'brunovariables',
      theme: cmTheme,
      lineWrapping: true,
      lineNumbers: false,
      brunoVarInfo: false, // Disable tooltips within the editor to prevent recursion
      scrollbarStyle: null,
      viewportMargin: Infinity
    });

    // Setup variable mode for syntax highlighting
    defineCodeMirrorBrunoVariablesMode(allVariables, 'text/plain', false, true);
    cmEditor.setOption('mode', 'brunovariables');

    // Setup autocomplete
    const getAllVariablesHandler = () => allVariables;
    const autoCompleteOptions = {
      getAllVariables: getAllVariablesHandler,
      showHintsFor: ['variables']
    };
    const autoCompleteCleanup = setupAutoComplete(cmEditor, autoCompleteOptions);

    // Handle secret/masked variables
    let maskedEditor = null;

    if (shouldMaskValue || isMasked) {
      maskedEditor = new MaskedEditor(cmEditor);
      maskedEditor.enable();
    }

    // Use the editor-formatted string so a no-op blur on a typed value doesn't dispatch.
    let originalValue = editorInitialValue;
    let isEditing = false;
    // Latest resolved value and mask state used by the copy button, eye toggle, and
    // error-revert path. Updated after each successful save so subsequent redraws
    // reflect the saved state. `??` preserves falsy-but-valid values like 0 / false.
    let currentInterpolatedValue = variableValue ?? '';
    let currentShouldMaskValue = shouldMaskValue;

    cmEditor.setOption('extraKeys', {
      'Enter': (cm) => {
        // Enter: save and blur
        cm.getInputField().blur();
      },
      'Shift-Enter': (cm) => {
        // Shift+Enter: insert new line
        cm.replaceSelection('\n', 'end');
      }
    });

    // Dynamically adjust editor height as content changes
    cmEditor.on('change', () => {
      if (isEditing) {
        // Use requestAnimationFrame for smoother updates after DOM changes
        requestAnimationFrame(() => {
          cmEditor.refresh();
          // Get height from the actual rendered sizer element (more accurate)
          const sizer = cmEditor.getWrapperElement().querySelector('.CodeMirror-sizer');
          const contentHeight = sizer ? sizer.clientHeight : cmEditor.getScrollInfo().height;
          const newHeight = calculateEditorHeight(contentHeight);
          editorContainer.style.height = `${newHeight}rem`;
        });
      }
    });

    // Icons container (top-right)
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'var-icons';

    let toggleButton = null;
    if (shouldMaskValue || isMasked || isNewVariable) {
      toggleButton = document.createElement('button');
      toggleButton.className = 'secret-toggle-button';
      toggleButton.setAttribute('data-testid', 'var-info-secret-toggle');
      toggleButton.innerHTML = EYE_ICON_SVG;
      toggleButton.type = 'button';
      toggleButton.style.display = (shouldMaskValue || isMasked) ? '' : 'none';

      toggleButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isRevealed = !isRevealed;

        // Update icon
        toggleButton.innerHTML = isRevealed ? EYE_OFF_ICON_SVG : EYE_ICON_SVG;

        // Update display mode using live state so post-save values/masking are reflected.
        updateValueDisplay(valueDisplay, currentInterpolatedValue, currentShouldMaskValue, isMasked, isRevealed);

        // Update editor mode
        if (maskedEditor) {
          isRevealed ? maskedEditor.disable() : maskedEditor.enable();
        }

        // Refocus the editor if it's currently in edit mode
        if (isEditing) {
          setTimeout(() => {
            cmEditor.focus();
          }, 0);
        }
      });

      iconsContainer.appendChild(toggleButton);
    }

    // Copy button (copy actual value, not masked). Uses a getter so it always
    // reflects the latest saved value, not the value captured at popup creation.
    const copyButton = getCopyButton(() => currentInterpolatedValue, () => {
      // Refocus the editor if it's currently in edit mode
      if (isEditing) {
        setTimeout(() => {
          cmEditor.focus();
        }, 0);
      }
    });
    iconsContainer.appendChild(copyButton);

    valueContainer.appendChild(valueDisplay);
    valueContainer.appendChild(editorContainer);
    valueContainer.appendChild(iconsContainer);

    // Click on display to enter edit mode
    valueDisplay.addEventListener('click', () => {
      if (isEditing) return;

      isEditing = true;

      // Stage editor off-visual first to avoid a visible resize/text flash.
      editorContainer.style.display = 'block';
      editorContainer.style.visibility = 'hidden';

      // Focus the editor and ensure proper sizing
      requestAnimationFrame(() => {
        cmEditor.refresh();

        // Adjust height based on content before revealing editor
        const sizer = cmEditor.getWrapperElement().querySelector('.CodeMirror-sizer');
        const contentHeight = sizer ? sizer.clientHeight : cmEditor.getScrollInfo().height;
        editorContainer.style.height = `${calculateEditorHeight(contentHeight)}rem`;

        // Swap display only after editor layout is ready
        valueDisplay.style.display = 'none';
        editorContainer.style.visibility = 'visible';
        cmEditor.focus();

        // Set cursor to end of content
        const lineCount = cmEditor.lineCount();
        const lastLine = cmEditor.getLine(lineCount - 1);
        cmEditor.setCursor(lineCount - 1, lastLine ? lastLine.length : 0);
      });
    });

    // Save on blur and return to display mode
    cmEditor.on('blur', () => {
      const newValue = cmEditor.getValue();

      // Switch back to display mode
      editorContainer.style.display = 'none';
      editorContainer.style.visibility = 'visible';
      editorContainer.style.height = `${EDITOR_MIN_HEIGHT}rem`; // Reset to minimum height
      valueDisplay.style.display = 'block';
      isEditing = false;

      if (newValue === originalValue) {
        return;
      }

      // Sync the displayed value with the new value (interpolated and masked if needed).
      const interpolatedValue = interpolate(newValue, allVariables);
      currentInterpolatedValue = interpolatedValue ?? '';
      const newHasSecretRefs = containsSecretVariableReferences(newValue, collection, item);

      // for new variable get the secret state from the switcher
      const ownSecret = isNewVariable ? getPendingSecret() : isSecret;
      currentShouldMaskValue = ownSecret || newHasSecretRefs;
      updateValueDisplay(valueDisplay, currentInterpolatedValue, currentShouldMaskValue, isMasked, isRevealed);

      // new variables are saved via the Add-to switcher, not on blur. so don't dispatch an update action here.
      if (isNewVariable) {
        return;
      }

      const dispatch = store.dispatch;
      dispatch(updateVariableInScope(variableName, newValue, scopeInfo, collection.uid))
        .then(() => {
          originalValue = newValue;

          // Re-fetch scopeInfo to get the updated variable reference after save
          const state = store.getState();
          const freshCollection = findCollectionByUid(state.collections.collections, collection.uid);
          if (collection) {
            const freshItem = item ? findItemInCollectionByItemUid(freshCollection, item.uid) : null;
            const updatedScopeInfo = getVariableScope(variableName, freshCollection, freshItem);
            if (updatedScopeInfo) {
              scopeInfo = updatedScopeInfo;
            }
          }
        })
        .catch((err) => {
          console.error('Failed to update variable:', err);
          toast.error(err?.message || 'Failed to update variable');
        });
    });

    // Store references for cleanup
    valueContainer._cmEditor = cmEditor;
    valueContainer._maskedEditor = maskedEditor;
    valueContainer._autoCompleteCleanup = autoCompleteCleanup;

    const applySecretMasking = (secretSelected) => {
      const hasSecretRefs = containsSecretVariableReferences(cmEditor.getValue(), collection, item);
      currentShouldMaskValue = secretSelected || hasSecretRefs;

      if (!currentShouldMaskValue) {
        isRevealed = false;
      }

      if (toggleButton) {
        toggleButton.style.display = currentShouldMaskValue ? '' : 'none';
        toggleButton.innerHTML = isRevealed ? EYE_OFF_ICON_SVG : EYE_ICON_SVG;
      }

      if (currentShouldMaskValue) {
        if (!maskedEditor) {
          maskedEditor = new MaskedEditor(cmEditor);
          valueContainer._maskedEditor = maskedEditor;
        }
        isRevealed ? maskedEditor.disable() : maskedEditor.enable();
      } else if (maskedEditor) {
        maskedEditor.disable();
      }

      updateValueDisplay(valueDisplay, currentInterpolatedValue, currentShouldMaskValue, isMasked, isRevealed);
    };

    // Only the request/folder's direct containing folder is offered as a creatable scope. not
    // any ancestor further up the tree.
    const isInFolderSettings = !!(item && item.type === 'folder');
    const parentFolder = item && !isInFolderSettings && collection
      ? findParentItemInCollection(collection, item.uid)
      : null;

    // When the tooltip is opened from folder settings itself, the "Folder" scope should target
    // that folder directly (labeled "Folder"), not an ancestor.
    const folderScopeTarget = isInFolderSettings ? item : parentFolder;

    // for new variables, add a switcher to select the scope to add the variable to (collection, request, folder, environment, global)
    if (isNewVariable) {
      const buildScopeInfoForSwitch = (scope) => {
        switch (scope.type) {
          case VARIABLE_ADD_SCOPES.COLLECTION:
            return { type: 'collection', value: '', data: { collection, variable: null } };
          case VARIABLE_ADD_SCOPES.REQUEST:
            return { type: 'request', value: '', data: { item, variable: null } };
          case VARIABLE_ADD_SCOPES.FOLDER:
            return { type: 'folder', value: '', data: { folder: folderScopeTarget, variable: null } };
          case VARIABLE_ADD_SCOPES.ENVIRONMENT: {
            const freshState = store.getState();
            const freshCollection = findCollectionByUid(freshState.collections.collections, collection.uid);
            const environment = (freshCollection?.environments || []).find(
              (env) => env.uid === freshCollection?.activeEnvironmentUid
            );
            return { type: 'environment', value: '', data: { environment, variable: null, secret: false } };
          }
          case VARIABLE_ADD_SCOPES.GLOBAL: {
            const freshGlobalState = store.getState();
            const globalEnvironments = freshGlobalState.globalEnvironments?.globalEnvironments || [];
            const activeGlobalEnvironmentUid = freshGlobalState.globalEnvironments?.activeGlobalEnvironmentUid;
            const globalEnvironment = globalEnvironments.find((env) => env.uid === activeGlobalEnvironmentUid);
            return { type: 'global', value: '', data: { environment: globalEnvironment, variable: null, secret: false } };
          }
          default:
            return null;
        }
      };

      const buildAddToScopes = () => {
        const addToScopesState = store.getState();
        const globalEnvironmentsState = addToScopesState.globalEnvironments || {};

        const freshCollectionForScopes = collection?.uid
          ? findCollectionByUid(addToScopesState.collections?.collections, collection.uid)
          : null;
        const activeEnvironmentName = (freshCollectionForScopes?.environments || []).find(
          (env) => env.uid === freshCollectionForScopes?.activeEnvironmentUid
        )?.name;
        const activeGlobalEnvironmentName = (globalEnvironmentsState.globalEnvironments || []).find(
          (env) => env.uid === globalEnvironmentsState.activeGlobalEnvironmentUid
        )?.name;

        return getAvailableAddToScopes({
          activeEnvironmentUid: activeEnvironmentName ? freshCollectionForScopes?.activeEnvironmentUid : undefined,
          activeEnvironmentName,
          activeGlobalEnvironmentUid: globalEnvironmentsState.activeGlobalEnvironmentUid,
          activeGlobalEnvironmentName,
          item,
          parentFolder: folderScopeTarget,
          isSelfFolder: isInFolderSettings,
          hasCollection: !!collection?.uid
        });
      };

      const getFreshScopeForType = (type) => buildAddToScopes().find((s) => s.type === type);

      const addToScopes = buildAddToScopes();

      // If there's only one available scope, select it by default. Otherwise, use the detected scope if it's available.
      const initialScope = addToScopes.find((s) => s.type === scopeInfo.type)
        || (addToScopes.length === 1 ? addToScopes[0] : null);

      // If the initial scope is different from the detected scope, rebuild the scopeInfo for the initial scope and update the badge.
      // This can happen if adding variable in Global Table where collection is not available.
      if (initialScope && initialScope.type !== scopeInfo.type) {
        scopeInfo = buildScopeInfoForSwitch(initialScope);
        setScopeBadgeContent(scopeBadge, initialScope.type, getScopeLabel(initialScope.type));
      }

      const removeAddToSwitcher = () => {
        if (valueContainer._addToSwitcher) {
          if (typeof valueContainer._addToSwitcher._destroy === 'function') {
            valueContainer._addToSwitcher._destroy();
          }
          valueContainer._addToSwitcher.remove();
          valueContainer._addToSwitcher = null;
        }
      };

      const persistNewVariable = (secret) => {
        const value = cmEditor.getValue();
        const scopeInfoToSave = scopeInfo && scopeInfo.data
          ? { ...scopeInfo, data: { ...scopeInfo.data, secret } }
          : scopeInfo;

        return store.dispatch(updateVariableInScope(variableName, value, scopeInfoToSave, collection.uid))
          .then(() => {
            originalValue = value;

            const state = store.getState();
            const freshCollection = findCollectionByUid(state.collections.collections, collection.uid);
            const freshItem = item ? findItemInCollectionByItemUid(freshCollection, item.uid) : null;
            const updatedScopeInfo = getVariableScope(variableName, freshCollection, freshItem);
            if (updatedScopeInfo) {
              scopeInfo = updatedScopeInfo;
              setScopeBadgeContent(scopeBadge, updatedScopeInfo.type, getScopeLabel(updatedScopeInfo.type));
            }

            const interpolatedValue = interpolate(value, allVariables);
            currentInterpolatedValue = interpolatedValue ?? '';
            const newHasSecretRefs = containsSecretVariableReferences(value, collection, item);
            // Use the secret flag actually being persisted (from the Secret checkbox).
            currentShouldMaskValue = secret || newHasSecretRefs;
            updateValueDisplay(valueDisplay, currentInterpolatedValue, currentShouldMaskValue, isMasked, isRevealed);

            removeAddToSwitcher();
          });
      };

      const onSwitchScope = (scope) => {
        const newScopeInfo = buildScopeInfoForSwitch(scope);
        if (!newScopeInfo) {
          return;
        }
        scopeInfo = newScopeInfo;
        setScopeBadgeContent(scopeBadge, newScopeInfo.type, getScopeLabel(newScopeInfo.type));
      };

      const onCreateEnvironment = (scope, name) => {
        const dispatch = store.dispatch;
        const trimmedName = (name || '').trim();

        if (!validateName(trimmedName)) {
          return Promise.reject(new Error(validateNameError(trimmedName)));
        }

        const freshState = store.getState();

        if (scope.type === VARIABLE_ADD_SCOPES.GLOBAL) {
          const globalEnvironments = freshState.globalEnvironments?.globalEnvironments || [];
          const isDuplicate = globalEnvironments.some(
            (env) => env?.name?.toLowerCase().trim() === trimmedName.toLowerCase()
          );
          if (isDuplicate) {
            return Promise.reject(new Error('Environment already exists'));
          }

          return dispatch(addGlobalEnvironment({ name: trimmedName, variables: [] }))
            .then(() => getFreshScopeForType(VARIABLE_ADD_SCOPES.GLOBAL));
        }

        if (scope.type === VARIABLE_ADD_SCOPES.ENVIRONMENT) {
          const freshCollection = findCollectionByUid(freshState.collections.collections, collection.uid);

          const isDuplicate = (freshCollection?.environments || []).some(
            (env) => env?.name?.toLowerCase().trim() === trimmedName.toLowerCase()
          );
          if (isDuplicate) {
            return Promise.reject(new Error('Environment already exists'));
          }

          return dispatch(addEnvironment(trimmedName, collection.uid))
            .then(() => waitForEnvironmentByName(collection.uid, trimmedName))
            .then((newEnvironment) => dispatch(selectEnvironment(newEnvironment.uid, collection.uid)))
            .then(() => getFreshScopeForType(VARIABLE_ADD_SCOPES.ENVIRONMENT));
        }

        return Promise.reject(new Error(`"${scope.label}" does not support creating a new one`));
      };

      const addToSwitcher = createAddToScopeSwitcher({
        scopes: addToScopes,
        initialScope,
        onSwitchScope,
        onCreateEnvironment,
        onSecretChange: applySecretMasking
      });
      valueContainer._addToSwitcher = addToSwitcher;

      // Called from `onDocumentClick` in showPopup when the tooltip is dismissed via an
      // outside click. update only if user has changed the value, otherwise do nothing.
      valueContainer._persistNewVariable = () => {
        if (cmEditor.getValue() === originalValue) {
          return Promise.resolve();
        }

        return persistNewVariable(getPendingSecret());
      };
    }
  } else {
    // Read-only display (for runtime, process.env, undefined variables)
    let isRevealed = false;

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'var-value-display';
    valueDisplay.setAttribute('data-testid', 'var-info-value-display');
    // For read-only variables, still check if they reference secrets
    updateValueDisplay(valueDisplay, variableValue, shouldMaskValue, isMasked, false);

    // Icons container
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'var-icons';

    // Eye toggle button (for read-only variables that reference secrets or are masked)
    if (shouldMaskValue || isMasked) {
      const toggleButton = document.createElement('button');
      toggleButton.className = 'secret-toggle-button';
      toggleButton.setAttribute('data-testid', 'var-info-secret-toggle');
      toggleButton.innerHTML = EYE_ICON_SVG;
      toggleButton.type = 'button';

      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isRevealed = !isRevealed;

        toggleButton.innerHTML = isRevealed ? EYE_OFF_ICON_SVG : EYE_ICON_SVG;
        updateValueDisplay(valueDisplay, variableValue, shouldMaskValue, isMasked, isRevealed);
      });

      iconsContainer.appendChild(toggleButton);
    }

    // Copy button (always copy actual value, not masked)
    const copyButton = getCopyButton(variableValue || '');
    iconsContainer.appendChild(copyButton);

    valueContainer.appendChild(valueDisplay);
    valueContainer.appendChild(iconsContainer);

    // Read-only note
    if (scopeInfo.type === 'process.env') {
      const readOnlyNote = document.createElement('div');
      readOnlyNote.className = 'var-readonly-note';
      readOnlyNote.setAttribute('data-testid', 'var-info-readonly-note');
      readOnlyNote.textContent = 'read-only';
      into.appendChild(readOnlyNote);
    } else if (scopeInfo.type === 'runtime' || hasRuntimeVariable) {
      const readOnlyNote = document.createElement('div');
      readOnlyNote.className = 'var-readonly-note';
      readOnlyNote.setAttribute('data-testid', 'var-info-readonly-note');
      readOnlyNote.textContent = 'Set by scripts (read-only)';
      into.appendChild(readOnlyNote);
    } else if (scopeInfo.type === 'oauth2') {
      const readOnlyNote = document.createElement('div');
      readOnlyNote.className = 'var-readonly-note';
      readOnlyNote.setAttribute('data-testid', 'var-info-readonly-note');
      readOnlyNote.textContent = 'read-only';
      into.appendChild(readOnlyNote);
    } else if (scopeInfo.type === 'undefined') {
      const readOnlyNote = document.createElement('div');
      readOnlyNote.className = 'var-readonly-note';
      readOnlyNote.setAttribute('data-testid', 'var-info-readonly-note');
      readOnlyNote.textContent = 'No active environment';
      into.appendChild(readOnlyNote);
    }
  }

  into.appendChild(valueContainer);

  if (valueContainer._addToSwitcher) {
    into.appendChild(valueContainer._addToSwitcher);
  }

  return into;
};

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');

  // Global state to track active popup
  let activePopup = null;

  CodeMirror.defineOption('brunoVarInfo', false, function (cm, options, old) {
    if (old && old !== CodeMirror.Init) {
      const oldOnMouseOver = cm.state.brunoVarInfo.onMouseOver;
      CodeMirror.off(cm.getWrapperElement(), 'mouseover', oldOnMouseOver);
      clearTimeout(cm.state.brunoVarInfo.hoverTimeout);
      delete cm.state.brunoVarInfo;
    }

    if (options) {
      const state = (cm.state.brunoVarInfo = createState(options));
      state.onMouseOver = onMouseOver.bind(null, cm);
      CodeMirror.on(cm.getWrapperElement(), 'mouseover', state.onMouseOver);
    }
  });

  function createState(options) {
    return {
      options: options instanceof Function ? { render: options } : options === true ? {} : options
    };
  }

  function getHoverTime(cm) {
    const options = cm.state.brunoVarInfo.options;
    return (options && options.hoverTime) || 50;
  }

  function onMouseOver(cm, e) {
    const state = cm.state.brunoVarInfo;
    const target = e.target || e.srcElement;

    // Prevent new tooltips if one is already active
    if (target.nodeName !== 'SPAN' || state.hoverTimeout !== undefined) {
      return;
    }
    // Show popover for both valid and invalid variables
    if (!target.classList.contains('cm-variable-valid') && !target.classList.contains('cm-variable-invalid')) {
      return;
    }

    const box = target.getBoundingClientRect();
    let point = { left: e.clientX, top: e.clientY };

    const onMouseMove = function (moveEvent) {
      point = { left: moveEvent.clientX, top: moveEvent.clientY };
      clearTimeout(state.hoverTimeout);
      state.hoverTimeout = setTimeout(onHover, hoverTime);
    };

    const onMouseOut = function () {
      CodeMirror.off(document, 'mousemove', onMouseMove);
      CodeMirror.off(cm.getWrapperElement(), 'mouseout', onMouseOut);
      clearTimeout(state.hoverTimeout);
      state.hoverTimeout = undefined;
    };

    const onHover = function () {
      CodeMirror.off(document, 'mousemove', onMouseMove);
      CodeMirror.off(cm.getWrapperElement(), 'mouseout', onMouseOut);
      state.hoverTimeout = undefined;
      onMouseHover(cm, box, point);
    };

    const hoverTime = getHoverTime(cm);
    state.hoverTimeout = setTimeout(onHover, hoverTime);

    CodeMirror.on(document, 'mousemove', onMouseMove);
    CodeMirror.on(cm.getWrapperElement(), 'mouseout', onMouseOut);
  }

  function onMouseHover(cm, box, point) {
    const pos = cm.coordsChar(point || {
      left: (box.left + box.right) / 2,
      top: (box.top + box.bottom) / 2
    });

    const state = cm.state.brunoVarInfo;
    const options = state.options;

    const line = cm.getLine(pos.line);
    if (!line) return;

    // ---------- 1) MODE: Double-Brace Variable {{ ... }} ----------
    // We check this first as it's the most common variable type.
    if (line.includes('{{') && line.includes('}}')) {
      // Check if the cursor is roughly between a '{{' to the left and '}}' to the right
      if (line.lastIndexOf('{{', pos.ch) !== -1 && line.indexOf('}}', pos.ch) !== -1) {
        let start = pos.ch;
        let end = pos.ch;

        // Scan LEFT to find the nearest '{{'
        while (start > 0) {
          const leftTwo = line.substring(start - 2, start);
          if (leftTwo === '{{') {
            start -= 2;
            break;
          }
          // If we hit a '}}' while looking for '{{', the cursor is outside a pair
          if (leftTwo === '}}') break;
          start--;
        }

        // Validate we actually found a '{{'
        if (start >= 0 && line.substring(start, start + 2) === '{{') {
          // Scan RIGHT to find the nearest '}}'
          while (end < line.length) {
            const rightTwo = line.substring(end, end + 2);
            if (rightTwo === '}}') {
              end += 2;
              break;
            }
            // If we hit another '{{' before a closing '}}', the structure is invalid
            if (rightTwo === '{{') {
              end = line.length + 1;
              break;
            }
            end++;
          }

          // Validate the final string and show popup
          if (end <= line.length && line.substring(end - 2, end) === '}}') {
            const fullVariableString = line.substring(start, end);
            const inner = fullVariableString.slice(2, -2).trim();

            if (inner) {
              const token = { string: fullVariableString, start, end };
              const brunoVarInfo = renderVarInfo(token, options);
              if (brunoVarInfo) {
                showPopup(cm, box, brunoVarInfo);
                return; // EXIT: We found a variable, don't look for path params
              }
            }
          }
        }
      }
    }

    // ---------- 2) MODE: Path Parameter /:varName ----------
    // If we didn't return from the brace logic, check if cursor is on a path param
    const pathParamStart = line.substring(0, pos.ch + 1).lastIndexOf('/:');

    if (pathParamStart !== -1) {
      let pathValueEnd = pathParamStart + 2;

      // Path params end at the next URL separator (/, ?, &, =) or end of line
      const separators = ['/', '?', '&', '='];
      while (pathValueEnd < line.length && !separators.includes(line[pathValueEnd])) {
        pathValueEnd++;
      }

      // Check if cursor is actually inside the detected /:param range
      if (pos.ch >= pathParamStart && pos.ch < pathValueEnd) {
        const fullVariableString = line.substring(pathParamStart, pathValueEnd);

        // Ensure it's not just "/:" but has a name (e.g., "/:id")
        if (fullVariableString.length > 2) {
          const token = {
            string: fullVariableString,
            start: pathParamStart,
            end: pathValueEnd
          };
          const brunoVarInfo = renderVarInfo(token, options);
          if (brunoVarInfo) {
            showPopup(cm, box, brunoVarInfo);
            return; // EXIT: Popup shown
          }
        }
      }
    }
  }

  function showPopup(cm, box, brunoVarInfo) {
    // If there's already an active popup, hide it first to ensure listeners are cleaned up
    if (activePopup && typeof activePopup._hidePopup === 'function') {
      activePopup._hidePopup({ immediate: true });
    } else if (activePopup && activePopup.parentNode) {
      activePopup.parentNode.removeChild(activePopup);
      activePopup = null;
    }

    const popup = document.createElement('div');
    popup.className = 'CodeMirror-brunoVarInfo';
    popup.setAttribute('data-testid', 'var-info-popup');
    popup.appendChild(brunoVarInfo);
    document.body.appendChild(popup);

    // Track this popup as the active one
    activePopup = popup;

    const popupBox = popup.getBoundingClientRect();
    const popupStyle = popup.currentStyle || window.getComputedStyle(popup);
    const popupWidth
      = popupBox.right - popupBox.left + parseFloat(popupStyle.marginLeft) + parseFloat(popupStyle.marginRight);
    const popupHeight
      = popupBox.bottom - popupBox.top + parseFloat(popupStyle.marginTop) + parseFloat(popupStyle.marginBottom);

    const GAP_REM = 0.5;
    const EDGE_MARGIN_REM = 0.9375;

    // Position below the trigger by default with gap
    let topPos = box.bottom + (GAP_REM * 16);

    // Check if there's enough space below; if not, position above
    if (popupHeight > window.innerHeight - box.bottom - (EDGE_MARGIN_REM * 16) && box.top > window.innerHeight - box.bottom) {
      topPos = box.top - popupHeight - (GAP_REM * 16);
    }

    // Ensure it doesn't go off the top of the screen
    if (topPos < 0) {
      topPos = box.bottom + (GAP_REM * 16);
    }

    // Horizontal positioning - align to left of trigger
    let leftPos = box.left;

    // Ensure it doesn't go off the right edge
    if (leftPos + popupWidth > window.innerWidth - (EDGE_MARGIN_REM * 16)) {
      leftPos = window.innerWidth - popupWidth - (EDGE_MARGIN_REM * 16);
    }

    // Ensure it doesn't go off the left edge
    if (leftPos < 0) {
      leftPos = 0;
    }

    popup.style.opacity = 1;
    popup.style.top = `${topPos / 16}rem`;
    popup.style.left = `${leftPos / 16}rem`;

    let popupTimeout;
    let isPinned = false;
    let isHidden = false;

    const onMouseOverPopup = function () {
      clearTimeout(popupTimeout);
    };

    const onMouseOut = function () {
      if (isPinned) {
        return;
      }
      clearTimeout(popupTimeout);
      popupTimeout = setTimeout(hidePopup, 500);
    };

    const onPopupClick = function (e) {
      if (!popup.contains(e.target)) {
        return;
      }
      isPinned = true;
      clearTimeout(popupTimeout);
    };

    const onDocumentClick = function (e) {
      if (popup.contains(document.activeElement)) {
        return;
      }

      if (!popup.contains(e.target)) {
        isPinned = false;

        const valueContainer = popup.querySelector('.var-value-container');
        if (valueContainer && typeof valueContainer._persistNewVariable === 'function') {
          valueContainer._persistNewVariable().catch((err) => {
            toast.error(err?.message || 'Failed to save variable');
          });
        }

        hidePopup({ immediate: true });
      }
    };

    // The popup is position:fixed, so any scroller around the editor strands it;
    // scroll events do not bubble, hence the capture-phase listener on document.
    const onScroll = function (e) {
      if (popup.contains(e.target)) {
        return;
      }
      const wrapper = cm.getWrapperElement();
      if (!e.target.contains(wrapper) && !wrapper.contains(e.target)) {
        return;
      }
      isPinned = false;
      hidePopup({ immediate: true });
    };

    const hidePopup = function (options = {}) {
      if (isHidden) {
        return;
      }
      isHidden = true;

      const { immediate = false } = options;
      clearTimeout(popupTimeout);
      CodeMirror.off(popup, 'mouseover', onMouseOverPopup);
      CodeMirror.off(popup, 'mouseout', onMouseOut);
      CodeMirror.off(popup, 'click', onPopupClick);
      CodeMirror.off(cm.getWrapperElement(), 'mouseout', onMouseOut);
      CodeMirror.off(document, 'click', onDocumentClick);
      CodeMirror.off(cm, 'change', onEditorChange);
      document.removeEventListener('scroll', onScroll, true);

      // Cleanup CodeMirror and MaskedEditor instances
      const valueContainer = popup.querySelector('.var-value-container');
      if (valueContainer) {
        // Cleanup autocomplete
        if (valueContainer._autoCompleteCleanup) {
          valueContainer._autoCompleteCleanup();
          valueContainer._autoCompleteCleanup = null;
        }

        // Cleanup MaskedEditor
        if (valueContainer._maskedEditor) {
          valueContainer._maskedEditor.destroy();
          valueContainer._maskedEditor = null;
        }

        // Cleanup CodeMirror
        if (valueContainer._cmEditor) {
          valueContainer._cmEditor.getWrapperElement().remove();
          valueContainer._cmEditor = null;
        }

        // Cleanup the "Add to" switcher (outside-click listener for its inline create form, etc.)
        if (valueContainer._addToSwitcher && typeof valueContainer._addToSwitcher._destroy === 'function') {
          valueContainer._addToSwitcher._destroy();
          valueContainer._addToSwitcher = null;
        }
      }

      // Clear the active popup reference
      if (activePopup === popup) {
        activePopup = null;
      }

      if (immediate) {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
        return;
      }

      if (popup.style.opacity) {
        popup.style.opacity = 0;
        setTimeout(function () {
          if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
          }
        }, 600);
      } else if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    };

    // Hide popup when user types in the main editor
    const onEditorChange = function () {
      if (!isPinned) {
        hidePopup();
      }
    };

    // Allow replacing existing popup with full cleanup
    popup._hidePopup = hidePopup;

    CodeMirror.on(popup, 'mouseover', onMouseOverPopup);
    CodeMirror.on(popup, 'mouseout', onMouseOut);
    CodeMirror.on(popup, 'click', onPopupClick);
    CodeMirror.on(cm.getWrapperElement(), 'mouseout', onMouseOut);
    CodeMirror.on(document, 'click', onDocumentClick);
    CodeMirror.on(cm, 'change', onEditorChange);
    document.addEventListener('scroll', onScroll, true);
  }
}

export const extractVariableInfo = (str, variables) => {
  let variableName;
  let variableValue;

  if (!str || !str.length || typeof str !== 'string') {
    return { variableName, variableValue };
  }

  // Regex to match double brace variable syntax: {{variableName}}
  const DOUBLE_BRACE_PATTERN = /\{\{([^}]+)\}\}/;

  if (DOUBLE_BRACE_PATTERN.test(str)) {
    variableName = str.replace('{{', '').replace('}}', '').trim();
    // Don't return empty variable names
    if (!variableName) {
      return { variableName: undefined, variableValue: undefined };
    }
    variableValue = interpolate(get(variables, variableName), variables);
  } else if (str.startsWith('/:')) {
    variableName = str.replace('/:', '').trim();
    // Don't return empty variable names
    if (!variableName) {
      return { variableName: undefined, variableValue: undefined };
    }
    variableValue = variables?.pathParams?.[variableName];
  } else if (str.startsWith('{{') && str.endsWith('}}')) {
    // Handle cases like {{}} or {{   }} (empty or whitespace only)
    // These don't match the pattern but look like variables
    return { variableName: undefined, variableValue: undefined };
  } else {
    // direct variable reference (e.g., for numeric values in JSON mode or plain variable names)
    variableName = str;
    variableValue = interpolate(get(variables, variableName), variables);
  }

  return { variableName, variableValue };
};
