/**
 *  Copyright (c) 2017, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file at https://github.com/graphql/codemirror-graphql/tree/v0.8.3
 */

import { interpolate } from '@usebruno/common';
import { getVariableScope, isVariableSecret, getAllVariables } from 'utils/collections';
import { updateVariableInScope } from 'providers/ReduxStore/slices/collections/actions';
import store from 'providers/ReduxStore';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { MaskedEditor } from 'utils/common/masked-editor';
import { setupAutoComplete } from 'utils/codemirror/autocomplete';

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
const EDITOR_MIN_HEIGHT = 60;
const EDITOR_MAX_HEIGHT = 178;

/**
 * Calculate editor height based on content, clamped between min and max
 * @param {number} contentHeight - The actual content height from CodeMirror
 * @returns {number} The clamped height value
 */
const calculateEditorHeight = (contentHeight) => {
  return Math.min(Math.max(contentHeight, EDITOR_MIN_HEIGHT), EDITOR_MAX_HEIGHT);
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
    'undefined': 'Undefined'
  };
  return labels[scopeType] || scopeType;
};

const getCopyButton = (variableValue, onCopyCallback) => {
  const copyButton = document.createElement('button');

  copyButton.className = 'copy-button';
  copyButton.innerHTML = COPY_ICON_SVG_TEXT;

  let isCopied = false;

  // Prevent mousedown from blurring the editor
  copyButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

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

  // Check if this is a process.env variable (starts with "process.env.")
  let scopeInfo;
  if (variableName.startsWith('process.env.')) {
    scopeInfo = {
      type: 'process.env',
      value: variableValue || '',
      data: null
    };
  } else {
    // Detect variable scope
    scopeInfo = getVariableScope(variableName, collection, item);

    // If variable doesn't exist in any scope, default to creating it at request level
    if (!scopeInfo) {
      if (item) {
        // Create as request variable if we have an item context
        scopeInfo = {
          type: 'request',
          value: '', // Empty value for new variable
          data: { item, variable: null } // variable is null since it doesn't exist yet
        };
      } else {
        // If no item context, show as undefined
        scopeInfo = {
          type: 'undefined',
          value: '',
          data: null
        };
      }
    }
  }

  // Check if variable is read-only (process.env, runtime, and undefined variables cannot be edited)
  const isReadOnly = scopeInfo.type === 'process.env' || scopeInfo.type === 'runtime' || scopeInfo.type === 'undefined';
  const isSecret = scopeInfo.type !== 'undefined' ? isVariableSecret(scopeInfo) : false;
  const isMasked = options?.variables?.maskedEnvVariables?.includes(variableName);

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
  scopeBadge.textContent = isNewVariable ? `${scopeLabel} (new)` : scopeLabel;

  header.appendChild(varName);
  header.appendChild(scopeBadge);
  into.appendChild(header);

  // Value container with icons
  const valueContainer = document.createElement('div');
  valueContainer.className = 'var-value-container';

  // Get raw value from scope
  const rawValue = scopeInfo?.value || '';

  // Create editable value display/editor (if editable)
  if (!isReadOnly && scopeInfo) {
    // Handle secret/masked variables state
    let isRevealed = false;

    // Create display element (shows interpolated value by default)
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'var-value-editable-display';
    // For masked values, show dots matching actual content length
    if (isSecret || isMasked) {
      const contentLength = (variableValue || '').length;
      valueDisplay.textContent = contentLength > 0 ? '•'.repeat(contentLength) : '';
    } else {
      valueDisplay.textContent = variableValue || '';
    }

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
      value: rawValue, // Use raw value (e.g., {{echo-host}} not resolved value)
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

    if (isSecret || isMasked) {
      maskedEditor = new MaskedEditor(cmEditor, '•');
      maskedEditor.enable();
    }

    // Store original value for comparison and track editing state
    let originalValue = rawValue;
    let isEditing = false;

    // Icons container (top-right)
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'var-icons';

    // Eye toggle button (for secrets)
    if (isSecret || isMasked) {
      const toggleButton = document.createElement('button');
      toggleButton.className = 'secret-toggle-button';
      toggleButton.innerHTML = EYE_ICON_SVG;

      // Prevent mousedown from blurring the editor
      toggleButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });

      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isRevealed = !isRevealed;

        if (isRevealed) {
          // Reveal actual value
          toggleButton.innerHTML = EYE_OFF_ICON_SVG;

          // Update display mode
          valueDisplay.textContent = variableValue || '';

          // Update editor mode
          if (maskedEditor) {
            maskedEditor.disable();
          }
        } else {
          // Mask value
          toggleButton.innerHTML = EYE_ICON_SVG;

          // Update display mode with correct length
          const contentLength = (variableValue || '').length;
          valueDisplay.textContent = contentLength > 0 ? '•'.repeat(contentLength) : '';

          // Update editor mode
          if (maskedEditor) {
            maskedEditor.enable();
          }
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
        editorContainer.style.height = `${calculateEditorHeight(contentHeight)}px`;
      }, 0);
    });

    // Save on blur and return to display mode
    cmEditor.on('blur', () => {
      const newValue = cmEditor.getValue();

      // Switch back to display mode
      editorContainer.style.display = 'none';
      editorContainer.style.height = `${EDITOR_MIN_HEIGHT}px`; // Reset to minimum height
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
            // Maintain the revealed/masked state
            if (isSecret || isMasked) {
              if (isRevealed) {
                valueDisplay.textContent = interpolatedValue || '';
              } else {
                const contentLength = (interpolatedValue || '').length;
                valueDisplay.textContent = contentLength > 0 ? '•'.repeat(contentLength) : '';
              }
            } else {
              valueDisplay.textContent = interpolatedValue || '';
            }
          })
          .catch((err) => {
            console.error('Failed to update variable:', err);
            // Revert on error
            cmEditor.setValue(originalValue);
            // Maintain the revealed/masked state on error
            if (isSecret || isMasked) {
              if (isRevealed) {
                valueDisplay.textContent = variableValue || '';
              } else {
                const contentLength = (variableValue || '').length;
                valueDisplay.textContent = contentLength > 0 ? '•'.repeat(contentLength) : '';
              }
            } else {
              valueDisplay.textContent = variableValue || '';
            }
          });
      }
    });

    // Store references for cleanup
    valueContainer._cmEditor = cmEditor;
    valueContainer._maskedEditor = maskedEditor;
    valueContainer._autoCompleteCleanup = autoCompleteCleanup;
  } else {
    // Read-only display
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'var-value-display';
    // For masked values, show dots matching actual content length
    if (isMasked) {
      const contentLength = (variableValue || '').length;
      valueDisplay.textContent = contentLength > 0 ? '•'.repeat(contentLength) : '';
    } else {
      valueDisplay.textContent = variableValue || '';
    }

    // Icons container
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'var-icons';

    // Copy button (always copy actual value, not masked)
    const copyButton = getCopyButton(variableValue || '');
    iconsContainer.appendChild(copyButton);

    valueContainer.appendChild(valueDisplay);
    valueContainer.appendChild(iconsContainer);

    // Read-only note
    if (scopeInfo?.type === 'process.env') {
      const readOnlyNote = document.createElement('div');
      readOnlyNote.className = 'var-readonly-note';
      readOnlyNote.textContent = 'read-only';
      into.appendChild(readOnlyNote);
    } else if (scopeInfo?.type === 'runtime') {
      const readOnlyNote = document.createElement('div');
      readOnlyNote.className = 'var-readonly-note';
      readOnlyNote.textContent = 'Set by scripts (read-only)';
      into.appendChild(readOnlyNote);
    } else if (scopeInfo?.type === 'undefined') {
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
    const token = cm.getTokenAt(pos, true);
    if (token) {
      const brunoVarInfo = renderVarInfo(token, options);
      if (brunoVarInfo) {
        showPopup(cm, box, brunoVarInfo);
      }
    }
  }

  function showPopup(cm, box, brunoVarInfo) {
    const popup = document.createElement('div');
    popup.className = 'CodeMirror-brunoVarInfo';
    popup.appendChild(brunoVarInfo);
    document.body.appendChild(popup);

    const popupBox = popup.getBoundingClientRect();
    const popupStyle = popup.currentStyle || window.getComputedStyle(popup);
    const popupWidth =
      popupBox.right - popupBox.left + parseFloat(popupStyle.marginLeft) + parseFloat(popupStyle.marginRight);
    const popupHeight =
      popupBox.bottom - popupBox.top + parseFloat(popupStyle.marginTop) + parseFloat(popupStyle.marginBottom);

    // Position below the trigger by default with 8px gap
    let topPos = box.bottom + 8;

    // Check if there's enough space below; if not, position above
    if (popupHeight > window.innerHeight - box.bottom - 15 && box.top > window.innerHeight - box.bottom) {
      topPos = box.top - popupHeight - 8;
    }

    // Ensure it doesn't go off the top of the screen
    if (topPos < 0) {
      topPos = box.bottom + 8;
    }

    // Horizontal positioning - align to left of trigger
    let leftPos = box.left;

    // Ensure it doesn't go off the right edge
    if (leftPos + popupWidth > window.innerWidth - 15) {
      leftPos = window.innerWidth - popupWidth - 15;
    }

    // Ensure it doesn't go off the left edge
    if (leftPos < 0) {
      leftPos = 0;
    }

    popup.style.opacity = 1;
    popup.style.top = topPos + 'px';
    popup.style.left = leftPos + 'px';

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

    CodeMirror.on(popup, 'mouseover', onMouseOverPopup);
    CodeMirror.on(popup, 'mouseout', onMouseOut);
    CodeMirror.on(cm.getWrapperElement(), 'mouseout', onMouseOut);
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
