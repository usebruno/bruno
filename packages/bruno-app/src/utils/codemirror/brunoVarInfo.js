/**
 *  Copyright (c) 2017, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file at https://github.com/graphql/codemirror-graphql/tree/v0.8.3
 */

import { interpolate, mockDataFunctions, timeBasedDynamicVars } from '@usebruno/common';
import { getVariableScope, isVariableSecret, getAllVariables } from 'utils/collections';
import { updateVariableInScope } from 'providers/ReduxStore/slices/collections/actions';
import store from 'providers/ReduxStore';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { MaskedEditor } from 'utils/common/masked-editor';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';
import { variableNameRegex } from 'utils/common/regex';

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
    'undefined': 'Undefined'
  };
  return labels[scopeType] || scopeType;
};

// Get the masked display text based on the value length
const getMaskedDisplay = (value) => {
  const contentLength = (value || '').length;
  return contentLength > 0 ? '*'.repeat(contentLength) : '';
};

// Update the value display based on the secret and masked state
const updateValueDisplay = (valueDisplay, value, isSecret, isMasked, isRevealed) => {
  if ((isSecret || isMasked) && !isRevealed) {
    valueDisplay.textContent = getMaskedDisplay(value);
  } else {
    valueDisplay.textContent = value || '';
  }
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

const getCopyButton = (variableValue, onCopyCallback) => {
  const copyButton = document.createElement('button');

  copyButton.className = 'copy-button';
  copyButton.innerHTML = COPY_ICON_SVG_TEXT;
  copyButton.type = 'button';

  let isCopied = false;

  copyButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Prevent clicking if showing success checkmark
    if (isCopied) {
      return;
    }

    navigator.clipboard
      .writeText(variableValue)
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
  } else {
    // Detect variable scope
    scopeInfo = getVariableScope(variableName, collection, item);

    // If variable doesn't exist in any scope, determine scope based on context
    if (!scopeInfo) {
      if (item) {
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
      } else if (collection) {
        // No item context but we have collection - create as collection variable
        scopeInfo = {
          type: 'collection',
          value: '',
          data: { collection, variable: null }
        };
      } else {
        // No context at all, show as undefined
        scopeInfo = {
          type: 'undefined',
          value: '',
          data: null
        };
      }
    }
  }

  // Check if variable is read-only (process.env, runtime, dynamic/faker, oauth2, and undefined variables cannot be edited)
  const isReadOnly = scopeInfo.type === 'process.env' || scopeInfo.type === 'runtime' || scopeInfo.type === 'dynamic' || scopeInfo.type === 'oauth2' || scopeInfo.type === 'undefined';

  // Get raw value from scope
  const rawValue = scopeInfo.value || '';

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
  varName.textContent = variableName;

  const scopeBadge = document.createElement('span');
  scopeBadge.className = 'var-scope-badge';

  // Show scope label with indication if it's a new variable
  const scopeLabel = scopeInfo ? getScopeLabel(scopeInfo.type) : 'Unknown';
  const isNewVariable = scopeInfo && scopeInfo.data && scopeInfo.data.variable === null;
  scopeBadge.textContent = isNewVariable ? `${scopeLabel}` : scopeLabel;

  header.appendChild(varName);
  header.appendChild(scopeBadge);
  into.appendChild(header);

  // Check if variable name is valid
  const isValidVariableName = scopeInfo.type === 'process.env' || scopeInfo.type === 'dynamic' || scopeInfo.type === 'oauth2' || variableNameRegex.test(variableName);

  // Show warning if variable name is invalid
  if (!isValidVariableName) {
    const warningNote = document.createElement('div');
    warningNote.className = 'var-warning-note';
    warningNote.textContent = 'Invalid variable name! Variables must only contain alpha-numeric characters, "-", "_", "."';
    into.appendChild(warningNote);

    // Don't show value or any other content for invalid variable names
    return into;
  }

  // Show warning for invalid dynamic variable (starts with $ but not a valid dynamic function)
  if (scopeInfo.type === 'dynamic' && !scopeInfo.isValidDynamicVariable) {
    const warningNote = document.createElement('div');
    warningNote.className = 'var-warning-note';
    warningNote.textContent = `Unknown dynamic variable "${variableName}". Check the variable name.`;
    into.appendChild(warningNote);
    return into;
  }

  // For valid dynamic variables, show appropriate read-only note based on type
  if (scopeInfo.type === 'dynamic' && scopeInfo.isValidDynamicVariable) {
    const readOnlyNote = document.createElement('div');
    readOnlyNote.className = 'var-readonly-note';
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
    warningNote.textContent = `OAuth2 token not found. Make sure you have fetched the token with the correct Token ID.`;
    into.appendChild(warningNote);
    return into;
  }

  // Value container with icons
  const valueContainer = document.createElement('div');
  valueContainer.className = 'var-value-container';

  // Create editable value display/editor (if editable)
  if (!isReadOnly && scopeInfo) {
    // Handle secret/masked variables state
    let isRevealed = false;

    // Create display element (shows interpolated value by default)
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'var-value-editable-display';
    // Mask the displayed value if it contains secrets or references to secrets
    updateValueDisplay(valueDisplay, variableValue, shouldMaskValue, isMasked, false);

    // Create container for CodeMirror (hidden by default)
    const editorContainer = document.createElement('div');
    editorContainer.className = 'var-value-editor';
    editorContainer.style.display = 'none'; // Hidden initially

    // Detect current theme from DOM
    const isDarkTheme = document.documentElement.classList.contains('dark');
    const cmTheme = isDarkTheme ? 'monokai' : 'default';

    // Get all variables for syntax highlighting (but prevent recursive tooltips)
    const allVariables = collection ? getAllVariables(collection, item) : {};

    // Create CodeMirror instance
    const cmEditor = CodeMirror(editorContainer, {
      value: typeof rawValue === 'string' ? rawValue : String(rawValue), // Use raw value (e.g., {{echo-host}} not resolved value) (ensure it's always a string for CodeMirror) #usebruno/bruno/#6265
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

    // Store original value for comparison and track editing state
    let originalValue = rawValue;
    let isEditing = false;

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

    // Eye toggle button (show if the displayed value is masked)
    if (shouldMaskValue || isMasked) {
      const toggleButton = document.createElement('button');
      toggleButton.className = 'secret-toggle-button';
      toggleButton.innerHTML = EYE_ICON_SVG;
      toggleButton.type = 'button';

      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isRevealed = !isRevealed;

        // Update icon
        toggleButton.innerHTML = isRevealed ? EYE_OFF_ICON_SVG : EYE_ICON_SVG;

        // Update display mode
        updateValueDisplay(valueDisplay, variableValue, shouldMaskValue, isMasked, isRevealed);

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

    // Copy button (copy actual value, not masked)
    const copyButton = getCopyButton(variableValue || '', () => {
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
      valueDisplay.style.display = 'none';
      editorContainer.style.display = 'block';

      // Focus the editor and ensure proper sizing
      setTimeout(() => {
        cmEditor.refresh();
        cmEditor.focus();

        // Set cursor to end of content
        const lineCount = cmEditor.lineCount();
        const lastLine = cmEditor.getLine(lineCount - 1);
        cmEditor.setCursor(lineCount - 1, lastLine ? lastLine.length : 0);

        // Adjust height based on content
        const contentHeight = cmEditor.getScrollInfo().height;
        editorContainer.style.height = `${calculateEditorHeight(contentHeight)}rem`;
      }, 0);
    });

    // Save on blur and return to display mode
    cmEditor.on('blur', () => {
      const newValue = cmEditor.getValue();

      // Switch back to display mode
      editorContainer.style.display = 'none';
      editorContainer.style.height = `${EDITOR_MIN_HEIGHT}rem`; // Reset to minimum height
      valueDisplay.style.display = 'block';
      isEditing = false;

      if (newValue !== originalValue) {
        // Dispatch Redux action to update variable
        const dispatch = store.dispatch;
        dispatch(updateVariableInScope(variableName, newValue, scopeInfo, collection.uid))
          .then(() => {
            originalValue = newValue;
            // Re-interpolate the new value to show the resolved value in display
            const interpolatedValue = interpolate(newValue, allVariables);
            // Check if the NEW value contains secret references
            const newHasSecretRefs = containsSecretVariableReferences(newValue, collection, item);
            const newShouldMask = isSecret || newHasSecretRefs;
            updateValueDisplay(valueDisplay, interpolatedValue, newShouldMask, isMasked, isRevealed);
          })
          .catch((err) => {
            console.error('Failed to update variable:', err);
            // Revert on error
            cmEditor.setValue(originalValue);
            updateValueDisplay(valueDisplay, variableValue, shouldMaskValue, isMasked, isRevealed);
          });
      }
    });

    // Store references for cleanup
    valueContainer._cmEditor = cmEditor;
    valueContainer._maskedEditor = maskedEditor;
    valueContainer._autoCompleteCleanup = autoCompleteCleanup;
  } else {
    // Read-only display (for runtime, process.env, undefined variables)
    let isRevealed = false;

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'var-value-display';
    // For read-only variables, still check if they reference secrets
    updateValueDisplay(valueDisplay, variableValue, shouldMaskValue, isMasked, false);

    // Icons container
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'var-icons';

    // Eye toggle button (for read-only variables that reference secrets or are masked)
    if (shouldMaskValue || isMasked) {
      const toggleButton = document.createElement('button');
      toggleButton.className = 'secret-toggle-button';
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
      readOnlyNote.textContent = 'read-only';
      into.appendChild(readOnlyNote);
    } else if (scopeInfo.type === 'runtime') {
      const readOnlyNote = document.createElement('div');
      readOnlyNote.className = 'var-readonly-note';
      readOnlyNote.textContent = 'Set by scripts (read-only)';
      into.appendChild(readOnlyNote);
    } else if (scopeInfo.type === 'oauth2') {
      const readOnlyNote = document.createElement('div');
      readOnlyNote.className = 'var-readonly-note';
      readOnlyNote.textContent = 'read-only';
      into.appendChild(readOnlyNote);
    } else if (scopeInfo.type === 'undefined') {
      const readOnlyNote = document.createElement('div');
      readOnlyNote.className = 'var-readonly-note';
      readOnlyNote.textContent = 'No active environment';
      into.appendChild(readOnlyNote);
    }
  }

  into.appendChild(valueContainer);

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

    const onMouseMove = function () {
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
      onMouseHover(cm, box);
    };

    const hoverTime = getHoverTime(cm);
    state.hoverTimeout = setTimeout(onHover, hoverTime);

    CodeMirror.on(document, 'mousemove', onMouseMove);
    CodeMirror.on(cm.getWrapperElement(), 'mouseout', onMouseOut);
  }

  function onMouseHover(cm, box) {
    const pos = cm.coordsChar({
      left: (box.left + box.right) / 2,
      top: (box.top + box.bottom) / 2
    });

    const state = cm.state.brunoVarInfo;
    const options = state.options;

    // Get the full line text where the hover happened
    const line = cm.getLine(pos.line);
    if (!line) return;

    // If the line doesn't even contain both braces, no need to run loops
    if (!line.includes('{{') || !line.includes('}}')) {
      return;
    }

    // lastIndexOf searches backward from the cursor indexOf searches forward
    if (line.lastIndexOf('{{', pos.ch) === -1 || line.indexOf('}}', pos.ch) === -1) {
      return;
    }
    let start = pos.ch;
    let end = pos.ch;

    // ---------- Find opening '{{' to the LEFT ----------
    while (start > 0) {
      const leftTwo = line.substring(start - 2, start);

      // If we find opening braces, stop
      if (leftTwo === '{{') {
        start -= 2;
        break;
      }

      // If we cross a closing braces before finding '{{', we're not inside a variable
      if (leftTwo === '}}') {
        return;
      }

      start--;
    }

    // If we reached the start of the line and didn't match '{{', return
    if (start < 0 || line.substring(start, start + 2) !== '{{') {
      return;
    }

    // ---------- Find closing '}}' to the RIGHT ----------
    while (end < line.length) {
      const rightTwo = line.substring(end, end + 2);

      // If we find closing braces, stop
      if (rightTwo === '}}') {
        end += 2;
        break;
      }

      // If we hit another '{{' before a '}}', then this isn't a valid enclosing pair
      if (rightTwo === '{{') {
        return;
      }

      end++;
    }
    // If we reached end-of-line without finding '}}', return
    if (end > line.length || line.substring(end - 2, end) !== '}}') {
      return;
    }

    const fullVariableString = line.substring(start, end);

    // Basic validation to ensure it's a non-empty variable
    if (!fullVariableString.startsWith('{{') || !fullVariableString.endsWith('}}')) {
      return;
    }

    // Prevent tooltips for empty variables like {{   }}
    const inner = fullVariableString.slice(2, -2).trim();
    if (!inner) return;

    // Build a token object compatible with renderVarInfo
    const token = {
      string: fullVariableString,
      start: start,
      end: end
    };

    const brunoVarInfo = renderVarInfo(token, options);
    if (brunoVarInfo) {
      showPopup(cm, box, brunoVarInfo);
    }
  }

  function showPopup(cm, box, brunoVarInfo) {
    // If there's already an active popup, remove it first
    if (activePopup && activePopup.parentNode) {
      activePopup.parentNode.removeChild(activePopup);
      activePopup = null;
    }

    const popup = document.createElement('div');
    popup.className = 'CodeMirror-brunoVarInfo';
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

    const onMouseOverPopup = function () {
      clearTimeout(popupTimeout);
    };

    const onMouseOut = function () {
      clearTimeout(popupTimeout);
      popupTimeout = setTimeout(hidePopup, 500);
    };

    const hidePopup = function () {
      CodeMirror.off(popup, 'mouseover', onMouseOverPopup);
      CodeMirror.off(popup, 'mouseout', onMouseOut);
      CodeMirror.off(cm.getWrapperElement(), 'mouseout', onMouseOut);
      CodeMirror.off(cm, 'change', onEditorChange);

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
      }

      // Clear the active popup reference
      if (activePopup === popup) {
        activePopup = null;
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
      hidePopup();
    };

    CodeMirror.on(popup, 'mouseover', onMouseOverPopup);
    CodeMirror.on(popup, 'mouseout', onMouseOut);
    CodeMirror.on(cm.getWrapperElement(), 'mouseout', onMouseOut);
    CodeMirror.on(cm, 'change', onEditorChange);
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
