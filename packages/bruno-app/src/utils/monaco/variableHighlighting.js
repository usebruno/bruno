import * as monaco from 'monaco-editor';
import get from 'lodash/get';
import { mockDataFunctions, interpolate, timeBasedDynamicVars } from '@usebruno/common';
import { getAllVariables, getVariableScope, isVariableSecret } from 'utils/collections';

const VARIABLE_REGEX = /\{\{([^}]*)\}\}/g;
const HOVER_DELAY = 50;
const HIDE_DELAY = 500;
const COPY_SUCCESS_TIMEOUT = 1000;

const SCOPE_LABELS = {
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
  'pathParam': 'Path Param'
};

const READ_ONLY_SCOPES = new Set(['process.env', 'runtime', 'dynamic', 'oauth2', 'undefined']);

const pathFoundInVariables = (path, obj) => {
  return get(obj, path) !== undefined;
};

// ─── SVG Icons ───────────────────────────────────────────────

const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const EYE_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// ─── Decoration Highlighting ─────────────────────────────────

/**
 * Applies decorations to highlight {{variable}} patterns in the editor.
 * Green for valid, red for invalid, blue for prompt variables.
 */
export const setupVariableHighlighting = (editor, collection, item) => {
  let decorationIds = [];

  const updateDecorations = () => {
    const model = editor.getModel();
    if (!model) return;

    const variables = getAllVariables(collection, item);
    const { pathParams = {}, maskedEnvVariables = [], ...varLookup } = variables;
    const text = model.getValue();
    const newDecorations = [];

    let match;
    VARIABLE_REGEX.lastIndex = 0;

    while ((match = VARIABLE_REGEX.exec(text)) !== null) {
      const varName = match[1];
      const startOffset = match.index;
      const endOffset = startOffset + match[0].length;
      const startPos = model.getPositionAt(startOffset);
      const endPos = model.getPositionAt(endOffset);

      let className;
      if (varName.startsWith('?')) {
        className = 'bruno-variable-prompt';
      } else {
        const isMockVariable = varName.startsWith('$') && mockDataFunctions.hasOwnProperty(varName.substring(1));
        const isValid = isMockVariable || pathFoundInVariables(varName, varLookup);
        className = isValid ? 'bruno-variable-valid' : 'bruno-variable-invalid';
      }

      newDecorations.push({
        range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
        options: {
          inlineClassName: className
        }
      });
    }

    decorationIds = editor.deltaDecorations(decorationIds, newDecorations);
  };

  updateDecorations();

  const disposable = editor.onDidChangeModelContent(() => {
    updateDecorations();
  });

  return () => {
    disposable.dispose();
    if (editor.getModel()) {
      decorationIds = editor.deltaDecorations(decorationIds, []);
    }
  };
};

// ─── Rich DOM Tooltip ────────────────────────────────────────

/**
 * Sets up a rich interactive tooltip for {{variable}} patterns,
 * matching the CodeMirror brunoVarInfo tooltip behavior.
 */
export const setupVariableTooltip = (editor, collectionRef, itemRef, dispatch) => {
  let activePopup = null;
  let hoverTimeout = null;
  let hideTimeout = null;
  let currentVarName = null;

  const getCollection = () => (typeof collectionRef === 'function' ? collectionRef() : collectionRef);
  const getItem = () => (typeof itemRef === 'function' ? itemRef() : itemRef);

  /**
   * Find the {{variable}} at a given position in the editor.
   * Returns { varName, startCol, endCol } or null.
   */
  const getVariableAtPosition = (position) => {
    const model = editor.getModel();
    if (!model) return null;

    const line = model.getLineContent(position.lineNumber);
    const matches = [...line.matchAll(/\{\{([^}]*)\}\}/g)];

    for (const match of matches) {
      const startCol = match.index + 1;
      const endCol = startCol + match[0].length;
      if (position.column >= startCol && position.column <= endCol) {
        return { varName: match[1], startCol, endCol, lineNumber: position.lineNumber };
      }
    }
    return null;
  };

  /**
   * Detect the scope of a variable, handling special prefixes.
   */
  const detectScope = (varName) => {
    const collection = getCollection();
    const item = getItem();

    if (varName.startsWith('$oauth2.')) {
      const variables = getAllVariables(collection, item);
      const value = get(variables, varName);
      return { type: 'oauth2', value, data: {} };
    }

    if (varName.startsWith('$')) {
      const fnName = varName.substring(1);
      const exists = mockDataFunctions.hasOwnProperty(fnName);
      const isTimeBased = timeBasedDynamicVars.has(fnName);
      return { type: 'dynamic', value: '', data: { exists, fnName, isTimeBased } };
    }

    if (varName.startsWith('process.env.')) {
      const envKey = varName.replace('process.env.', '');
      const variables = getAllVariables(collection, item);
      const value = get(variables, varName);
      return { type: 'process.env', value, data: { envKey } };
    }

    const scopeInfo = getVariableScope(varName, collection, item);
    if (scopeInfo) return scopeInfo;

    // If variable doesn't exist in any scope, determine default scope based on context
    // (matches CodeMirror brunoVarInfo behavior)
    if (item && item.uid) {
      const isFolder = item.type === 'folder';
      if (isFolder) {
        return { type: 'folder', value: '', data: { folder: item, variable: null } };
      } else {
        return { type: 'request', value: '', data: { item, variable: null } };
      }
    } else if (collection) {
      return { type: 'collection', value: '', data: { collection, variable: null } };
    }

    return { type: 'undefined', value: undefined, data: {} };
  };

  /**
   * Get the interpolated value of a variable.
   */
  const getInterpolatedValue = (rawValue) => {
    if (rawValue === undefined || rawValue === null) return '';
    const collection = getCollection();
    const variables = getAllVariables(collection, getItem());
    const { pathParams, maskedEnvVariables, ...varLookup } = variables;
    try {
      return interpolate(String(rawValue), varLookup);
    } catch {
      return String(rawValue);
    }
  };

  /**
   * Check if the raw value contains references to secret variables.
   */
  const containsSecretReferences = (rawValue) => {
    if (!rawValue || typeof rawValue !== 'string') return false;
    const collection = getCollection();
    const item = getItem();
    const matches = rawValue.matchAll(/\{\{([^}]+)\}\}/g);
    for (const match of matches) {
      const refName = match[1].trim();
      const refScope = getVariableScope(refName, collection, item);
      if (refScope && isVariableSecret(refScope)) return true;
    }
    return false;
  };

  /**
   * Create and show the tooltip popup.
   */
  const showTooltip = (varInfo) => {
    hidePopup();
    const { varName, lineNumber, startCol } = varInfo;

    // Prompt variables ({{?name}}) don't need a tooltip
    if (varName.startsWith('?')) return;

    const collection = getCollection();
    const scopeInfo = detectScope(varName);
    const scopeType = scopeInfo.type;
    const scopeLabel = SCOPE_LABELS[scopeType] || 'Unknown';
    const rawValue = scopeInfo.value !== undefined ? String(scopeInfo.value) : '';
    const isReadOnly = READ_ONLY_SCOPES.has(scopeType)
      || (collection?.runtimeVariables && collection.runtimeVariables[varName]);
    const isSecret = scopeType !== 'undefined' && isVariableSecret(scopeInfo);
    const hasSecretRefs = containsSecretReferences(rawValue);
    const shouldMask = isSecret || hasSecretRefs;

    let isRevealed = false;
    const interpolatedValue = getInterpolatedValue(rawValue);
    const displayValue = typeof scopeInfo.value === 'object'
      ? JSON.stringify(scopeInfo.value, null, 2)
      : interpolatedValue;

    // ─── Build DOM ─────────────────────────────

    const popup = document.createElement('div');
    popup.className = 'CodeMirror-brunoVarInfo';

    // Header: name + scope badge
    const header = document.createElement('div');
    header.className = 'var-info-header';

    const nameEl = document.createElement('span');
    nameEl.className = 'var-name';
    nameEl.textContent = varName;
    nameEl.title = varName;
    header.appendChild(nameEl);

    const badge = document.createElement('span');
    badge.className = 'var-scope-badge';
    badge.textContent = scopeLabel;
    header.appendChild(badge);

    popup.appendChild(header);

    // Dynamic variables: show only a note, no value container (matches CodeMirror)
    if (scopeType === 'dynamic') {
      if (!scopeInfo.data.exists) {
        const warning = document.createElement('div');
        warning.className = 'var-warning-note';
        warning.textContent = `Unknown dynamic variable "${varName}". Check the variable name.`;
        popup.appendChild(warning);
      } else {
        const note = document.createElement('div');
        note.className = 'var-readonly-note';
        note.textContent = scopeInfo.data.isTimeBased
          ? 'Generates current timestamp on each request'
          : 'Generates random value on each request';
        popup.appendChild(note);
      }

      positionAndShowPopup(popup, varName, lineNumber, startCol);
      return;
    }

    // Value container
    const valueContainer = document.createElement('div');
    valueContainer.className = 'var-value-container';

    // Value display
    const valueDisplay = document.createElement('div');
    valueDisplay.className = isReadOnly ? 'var-value-display' : 'var-value-editable-display';

    const updateValueDisplay = () => {
      if (shouldMask && !isRevealed) {
        valueDisplay.textContent = displayValue ? '*'.repeat(Math.min(displayValue.length, 20)) : '';
      } else {
        valueDisplay.textContent = displayValue || '';
      }
    };
    updateValueDisplay();

    // Editor (textarea) — hidden by default
    let editorEl = null;
    if (!isReadOnly && scopeType !== 'undefined') {
      editorEl = document.createElement('textarea');
      editorEl.className = 'var-value-editor-textarea';
      editorEl.value = rawValue;
      editorEl.style.display = 'none';
      editorEl.style.width = '100%';
      editorEl.style.minHeight = '1.75rem';
      editorEl.style.maxHeight = '11.125rem';
      editorEl.style.resize = 'vertical';
      editorEl.style.boxSizing = 'border-box';
      editorEl.style.padding = '0.375rem 0.5rem';
      editorEl.style.border = 'none';
      editorEl.style.outline = 'none';
      editorEl.style.background = 'inherit';
      editorEl.style.color = 'inherit';
      editorEl.style.fontFamily = 'Inter, sans-serif';
      editorEl.style.fontSize = 'inherit';
      editorEl.style.lineHeight = '1.25rem';

      valueDisplay.addEventListener('click', () => {
        valueDisplay.style.display = 'none';
        editorEl.style.display = 'block';
        editorEl.value = rawValue;
        editorEl.focus();
        editorEl.setSelectionRange(editorEl.value.length, editorEl.value.length);
      });

      editorEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          editorEl.blur();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          editorEl.value = rawValue;
          editorEl.style.display = 'none';
          valueDisplay.style.display = '';
        }
      });

      editorEl.addEventListener('blur', () => {
        const newValue = editorEl.value;
        if (newValue !== rawValue && dispatch) {
          dispatch(updateVariableInScope(varName, newValue, scopeInfo, collection.uid));
        }
        editorEl.style.display = 'none';
        valueDisplay.style.display = '';
      });
    }

    valueContainer.appendChild(valueDisplay);
    if (editorEl) {
      valueContainer.appendChild(editorEl);
    }

    // Icons container
    const icons = document.createElement('div');
    icons.className = 'var-icons';

    // Secret toggle button
    if (shouldMask) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'secret-toggle-button';
      toggleBtn.innerHTML = EYE_ICON;
      toggleBtn.title = 'Reveal value';
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isRevealed = !isRevealed;
        toggleBtn.innerHTML = isRevealed ? EYE_OFF_ICON : EYE_ICON;
        toggleBtn.title = isRevealed ? 'Mask value' : 'Reveal value';
        updateValueDisplay();
      });
      icons.appendChild(toggleBtn);
    }

    // Copy button
    if (scopeType !== 'undefined') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-button';
      copyBtn.innerHTML = COPY_ICON;
      copyBtn.title = 'Copy value';
      let copyTimeout = null;
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (copyTimeout) return;
        const textToCopy = typeof scopeInfo.value === 'object'
          ? JSON.stringify(scopeInfo.value) : interpolatedValue;
        navigator.clipboard.writeText(textToCopy).then(() => {
          copyBtn.innerHTML = CHECK_ICON;
          copyBtn.classList.add('copy-success');
          copyTimeout = setTimeout(() => {
            copyBtn.innerHTML = COPY_ICON;
            copyBtn.classList.remove('copy-success');
            copyTimeout = null;
          }, COPY_SUCCESS_TIMEOUT);
        });
      });
      icons.appendChild(copyBtn);
    }

    valueContainer.appendChild(icons);
    popup.appendChild(valueContainer);

    // Notes
    if (isReadOnly && scopeType !== 'undefined') {
      const note = document.createElement('div');
      note.className = 'var-readonly-note';
      if (scopeType === 'runtime') {
        note.textContent = 'Set by scripts (read-only)';
      } else if (scopeType === 'process.env') {
        note.textContent = 'Process environment variable (read-only)';
      } else if (scopeType === 'oauth2') {
        note.textContent = 'OAuth2 credential (read-only)';
      }
      if (note.textContent) popup.appendChild(note);
    }

    if (scopeType === 'undefined') {
      const warning = document.createElement('div');
      warning.className = 'var-warning-note';
      warning.textContent = 'Variable is not defined in any scope';
      popup.appendChild(warning);
    }

    // ─── Position & Show ───────────────────────

    positionAndShowPopup(popup, varName, lineNumber, startCol);
  };

  const positionAndShowPopup = (popup, varName, lineNumber, startCol) => {
    document.body.appendChild(popup);
    activePopup = popup;
    currentVarName = varName;

    // Get screen coordinates from editor
    const editorDom = editor.getDomNode();
    const scrolledPos = editor.getScrolledVisiblePosition({ lineNumber, column: startCol });

    if (scrolledPos && editorDom) {
      const editorRect = editorDom.getBoundingClientRect();
      let top = editorRect.top + scrolledPos.top + scrolledPos.height + 4;
      let left = editorRect.left + scrolledPos.left;

      // If tooltip would overflow bottom, show above
      const popupRect = popup.getBoundingClientRect();
      if (top + popupRect.height > window.innerHeight) {
        top = editorRect.top + scrolledPos.top - popupRect.height - 4;
      }

      // Prevent right overflow
      if (left + popupRect.width > window.innerWidth) {
        left = window.innerWidth - popupRect.width - 8;
      }

      // Prevent left overflow
      if (left < 4) left = 4;

      popup.style.position = 'fixed';
      popup.style.top = `${top / 16}rem`;
      popup.style.left = `${left / 16}rem`;
    }

    popup.style.opacity = '1';

    // Keep popup alive while mouse is over it
    popup.addEventListener('mouseover', () => {
      clearTimeout(hideTimeout);
    });
    popup.addEventListener('mouseout', (e) => {
      // Don't hide if moving within the popup
      if (popup.contains(e.relatedTarget)) return;
      startHideTimer();
    });
  };

  const hidePopup = () => {
    clearTimeout(hoverTimeout);
    clearTimeout(hideTimeout);
    if (activePopup) {
      activePopup.style.opacity = '0';
      const popupToRemove = activePopup;
      setTimeout(() => {
        popupToRemove.remove();
      }, 150);
      activePopup = null;
      currentVarName = null;
    }
  };

  const startHideTimer = () => {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(hidePopup, HIDE_DELAY);
  };

  // ─── Event Handlers ──────────────────────────

  const onMouseMove = editor.onMouseMove((e) => {
    if (!e.target.position) {
      clearTimeout(hoverTimeout);
      if (activePopup) startHideTimer();
      return;
    }

    const varInfo = getVariableAtPosition(e.target.position);

    if (varInfo) {
      // Same variable — keep current popup
      if (activePopup && currentVarName === varInfo.varName) {
        clearTimeout(hideTimeout);
        return;
      }

      clearTimeout(hoverTimeout);
      clearTimeout(hideTimeout);
      hoverTimeout = setTimeout(() => {
        showTooltip(varInfo);
      }, HOVER_DELAY);
    } else {
      clearTimeout(hoverTimeout);
      if (activePopup) startHideTimer();
    }
  });

  const onMouseLeave = editor.onMouseLeave(() => {
    clearTimeout(hoverTimeout);
    if (activePopup) startHideTimer();
  });

  // Hide immediately when user types
  const onChange = editor.onDidChangeModelContent(() => {
    hidePopup();
  });

  return () => {
    onMouseMove.dispose();
    onMouseLeave.dispose();
    onChange.dispose();
    hidePopup();
  };
};

// Import for the dispatch action
import { updateVariableInScope } from 'providers/ReduxStore/slices/collections/actions';
