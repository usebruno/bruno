/**
 *  Copyright (c) 2017, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file at https://github.com/graphql/codemirror-graphql/tree/v0.8.3
 */

import { interpolate } from '@usebruno/common';
import { store } from 'providers/ReduxStore';
import { saveGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { saveEnvironment, saveCollectionRoot, saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { updateCollectionVar, updateFolderVar, updateRuntimeVariable as updateRuntimeVariableAction } from 'providers/ReduxStore/slices/collections';

let CodeMirror;
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;
const { get } = require('lodash');

const COPY_ICON_SVG_TEXT = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
`;

const CHECKMARK_ICON_SVG_TEXT = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20,6 9,17 4,12"></polyline>
</svg>
`;

const COPY_SUCCESS_COLOR = '#22c55e';

export const COPY_SUCCESS_TIMEOUT = 1000;

const getCopyButton = (variableValue) => {
  const copyButton = document.createElement('button');

  copyButton.className = 'copy-button';
  copyButton.style.backgroundColor = 'transparent';
  copyButton.style.border = 'none';
  copyButton.style.color = '#989898';
  copyButton.style.cursor = 'pointer';
  copyButton.style.padding = '2px';
  copyButton.style.opacity = '0.7';
  copyButton.style.transition = 'opacity 0.2s ease';
  copyButton.style.display = 'flex';
  copyButton.style.alignItems = 'center';
  copyButton.style.justifyContent = 'center';

  copyButton.innerHTML = COPY_ICON_SVG_TEXT;

  let isCopied = false;

  copyButton.addEventListener('mouseenter', () => {
    if (isCopied) {
      return;
    }

    copyButton.style.opacity = '1';
  });

  copyButton.addEventListener('mouseleave', () => {
    if (isCopied) {
      return;
    }

    copyButton.style.opacity = '0.7';
  });

  copyButton.addEventListener('click', (e) => {
    e.stopPropagation();

    // Prevent clicking if showing success checkmark
    if (isCopied) {
      return;
    }

    navigator.clipboard
      .writeText(variableValue)
      .then(() => {
        isCopied = true;
        copyButton.innerHTML = CHECKMARK_ICON_SVG_TEXT;
        copyButton.style.opacity = '1';
        copyButton.style.color = COPY_SUCCESS_COLOR;
        copyButton.style.cursor = 'default';
        copyButton.classList.add('copy-success');

        setTimeout(() => {
          isCopied = false;
          copyButton.innerHTML = COPY_ICON_SVG_TEXT;
          copyButton.style.opacity = '0.7';
          copyButton.style.color = '#989898';
          copyButton.style.cursor = 'pointer';
          copyButton.classList.remove('copy-success');
        }, COPY_SUCCESS_TIMEOUT);
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err.message);
      });
  });

  return copyButton;
};

export const renderVarInfo = (token, options, cm, pos) => {
  // Extract variable name and value based on token
  const { variableName, variableValue } = extractVariableInfo(token.string, options.variables);

  if (variableValue === undefined) {
    return;
  }

  const into = document.createElement('div');

  appendVariableHeader(into, variableName, options);
  appendVariableValue(into, variableName, variableValue, options, cm);

  return into;
};

const appendVariableHeader = (container, variableName, options) => {
  const variableType = getVariableType(variableName, options);

  // Create wrapper container for header
  const headerWrapper = document.createElement('div');
  headerWrapper.className = 'info-header-wrapper';

  // Add variable name first (outside the badge)
  const variableNameSpan = document.createElement('span');
  variableNameSpan.className = 'info-variable-name';
  variableNameSpan.textContent = variableName;
  headerWrapper.appendChild(variableNameSpan);

  // Add badge with type
  const headerDiv = document.createElement('div');
  headerDiv.className = 'info-name';
  const formattedType = variableType.charAt(0).toUpperCase() + variableType.slice(1);
  headerDiv.textContent = formattedType;
  headerWrapper.appendChild(headerDiv);

  container.appendChild(headerWrapper);
};

const appendVariableValue = (container, variableName, variableValue, options, cm) => {
  const variableType = getVariableType(variableName, options);
  const isEditable = isVariableEditable(variableType);
  const isMasked = isVariableMasked(variableName, options);

  const valueContainer = createValueContainer(variableName, variableValue, isMasked, isEditable, options, cm);
  container.appendChild(valueContainer);

  if (!isEditable) {
    container.appendChild(createReadOnlyInfo());
  }
};

const isVariableEditable = (variableType) => {
  return ['global', 'environment', 'collection', 'folder'].includes(variableType);
};

const isVariableMasked = (variableName, options) => {
  return options?.variables?.maskedEnvVariables?.includes(variableName);
};

const createValueContainer = (variableName, variableValue, isMasked, isEditable, options, cm) => {
  const valueContainer = document.createElement('div');
  valueContainer.className = 'value-container';

  const displayValue = isMasked ? '*****' : variableValue;

  // For editable variables, show multiline editor
  if (isEditable && !isMasked) {
    const editTextarea = createEditTextarea(variableName, variableValue, options, cm, valueContainer);
    valueContainer.appendChild(editTextarea);
  } else {
    // For masked or read-only variables, show a read-only textarea that looks like the editable one
    const readOnlyTextarea = createReadOnlyTextarea(displayValue);
    valueContainer.appendChild(readOnlyTextarea);
  }

  const copyButton = getCopyButton(variableValue);
  valueContainer.appendChild(copyButton);

  return valueContainer;
};

const createValueDisplay = (displayValue) => {
  const descriptionDiv = document.createElement('div');
  descriptionDiv.className = 'info-description';
  descriptionDiv.appendChild(document.createTextNode(displayValue));
  return descriptionDiv;
};

const createReadOnlyTextarea = (displayValue) => {
  const readOnlyTextarea = document.createElement('textarea');
  readOnlyTextarea.className = 'edit-textarea read-only-textarea';
  readOnlyTextarea.value = displayValue;
  readOnlyTextarea.readOnly = true;
  readOnlyTextarea.disabled = false;
  readOnlyTextarea.rows = 1;
  readOnlyTextarea.style.cursor = 'default';

  // Auto-resize textarea based on content
  const autoResize = () => {
    readOnlyTextarea.style.height = 'auto';
    const scrollHeight = readOnlyTextarea.scrollHeight;
    const maxHeight = 300;
    readOnlyTextarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    readOnlyTextarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  // Initial resize - use setTimeout to ensure DOM is fully rendered
  setTimeout(() => {
    autoResize();
  }, 0);

  return readOnlyTextarea;
};

const createEditTextarea = (variableName, variableValue, options, cm, valueContainer) => {
  const editTextarea = document.createElement('textarea');
  editTextarea.className = 'edit-textarea';
  editTextarea.value = variableValue;
  editTextarea.rows = 1;
  editTextarea.setAttribute('data-variable-name', variableName);
  editTextarea.setAttribute('data-original-value', variableValue);

  // Auto-resize textarea based on content
  const autoResize = () => {
    editTextarea.style.height = 'auto';
    const scrollHeight = editTextarea.scrollHeight;
    const maxHeight = 300; // Increased max height to allow more content
    editTextarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    editTextarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  // Initial resize - use setTimeout to ensure DOM is fully rendered
  setTimeout(() => {
    autoResize();
  }, 0);

  // Resize on input
  editTextarea.addEventListener('input', autoResize);

  // Also resize on paste
  editTextarea.addEventListener('paste', () => {
    setTimeout(autoResize, 0);
  });

  // Store save function on textarea for auto-save on popup close
  editTextarea._saveFunction = async () => {
    const newValue = editTextarea.value;
    const originalValue = editTextarea.getAttribute('data-original-value');

    // Only save if value changed
    if (newValue !== originalValue) {
      try {
        await updateVariableValue(variableName, newValue, options, cm);
        editTextarea.setAttribute('data-original-value', newValue);
      } catch (error) {
        console.error('Failed to auto-save variable:', error);
        // Revert to original value on error
        editTextarea.value = originalValue;
      }
    }
  };

  return editTextarea;
};

const createReadOnlyInfo = () => {
  const infoDiv = document.createElement('div');
  infoDiv.className = 'read-only-info';
  infoDiv.textContent = 'This type of variable cannot be edited from tooltips.';
  return infoDiv;
};

// Helper function to determine variable type
const getVariableType = (variableName, options) => {
  const reduxStore = store;

  if (!reduxStore) {
    console.warn('Bruno Variable Info: Store not available for variable type detection');
    // When store is unavailable, we can make some basic assumptions
    if (variableName.startsWith('process.env.')) {
      return 'process';
    }
    // Default to runtime for variables that appear in the variables object
    return options?.variables?.[variableName] !== undefined ? 'runtime' : 'unknown';
  }

  const state = reduxStore.getState();
  const globalEnvironments = state?.globalEnvironments?.globalEnvironments;
  const activeGlobalEnvironmentUid = state?.globalEnvironments?.activeGlobalEnvironmentUid;
  const collections = state?.collections?.collections;

  // Check global environment
  const activeGlobalEnv = globalEnvironments?.find((env) => env?.uid === activeGlobalEnvironmentUid);
  if (activeGlobalEnv?.variables?.some((v) => v.name === variableName)) {
    return 'global';
  }

  // Check collection environments
  if (collections) {
    for (const collection of collections) {
      if (collection.activeEnvironmentUid && collection.environments) {
        const environment = collection.environments.find((env) => env.uid === collection.activeEnvironmentUid);
        if (environment?.variables?.some((v) => v.name === variableName)) {
          return 'environment';
        }
      }
    }
  }

  // Check collection variables
  if (collections) {
    for (const collection of collections) {
      if (collection.root?.request?.vars?.req?.some((v) => v.name === variableName)) {
        return 'collection';
      }
    }
  }

  // Check folder variables (recursive check through all folders in collections)
  if (collections) {
    for (const collection of collections) {
      if (hasFolderVariable(collection.items, variableName)) {
        return 'folder';
      }
    }
  }

  // Check if it's a process env variable
  if (variableName.startsWith('process.env.')) {
    return 'process';
  }

  return 'runtime';
};

const hasFolderVariable = (items, variableName) => {
  if (!items || !Array.isArray(items)) {
    return false;
  }

  for (const item of items) {
    // Check if this item is a folder and has the variable
    if (item.type === 'folder') {
      const folderVars = item.root?.request?.vars?.req || [];
      if (folderVars.some((v) => v.name === variableName && v.enabled)) {
        return true;
      }

      // Recursively check nested folders
      if (item.items && hasFolderVariable(item.items, variableName)) {
        return true;
      }
    }
  }

  return false;
};

// Function to update variable value
const updateVariableValue = async (variableName, newValue, options, cm) => {
  validateUpdateParameters(variableName, newValue, options);

  const variableType = getVariableType(variableName, options);

  if (!store) {
    throw new Error(`Store not available to update variable '${variableName}'`);
  }

  const state = store.getState();

  switch (variableType) {
    case 'global':
      return updateGlobalVariable(variableName, newValue, state, store);
    case 'environment':
      return updateEnvironmentVariable(variableName, newValue, state, store);
    case 'runtime':
      return updateRuntimeVariable(variableName, newValue, options, cm, store);
    case 'collection':
      return updateCollectionVariable(variableName, newValue, options, cm, store);
    case 'folder':
      return updateFolderVariable(variableName, newValue, options, cm, store);
    default:
      throw new Error(`Variable '${variableName}' not found in editable contexts. Global, environment, and runtime variables can be edited from tooltips.`);
  }
};

const validateUpdateParameters = (variableName, newValue, options) => {
  if (!variableName) {
    throw new Error('Variable name is required');
  }
  if (!options?.variables) {
    throw new Error('No variables context available');
  }
};

const updateGlobalVariable = async (variableName, newValue, state, reduxStore) => {
  const activeGlobalEnv = getActiveGlobalEnvironment(state);

  if (!activeGlobalEnv) {
    throw new Error('No active global environment found');
  }

  const globalVar = activeGlobalEnv.variables?.find((v) => v.name === variableName);
  if (!globalVar) {
    throw new Error(`Global variable '${variableName}' not found`);
  }

  const updatedVariables = updateVariableInArray(activeGlobalEnv.variables, variableName, newValue);

  await reduxStore.dispatch(saveGlobalEnvironment({
    environmentUid: state.globalEnvironments.activeGlobalEnvironmentUid,
    variables: updatedVariables
  }));
};

const updateEnvironmentVariable = async (variableName, newValue, state, reduxStore) => {
  const collections = state?.collections?.collections;
  if (!collections) {
    throw new Error('No collections found');
  }

  for (const collection of collections) {
    const environment = getActiveEnvironment(collection);
    if (!environment) continue;

    const envVar = environment.variables?.find((v) => v.name === variableName && v.enabled);
    if (envVar) {
      const updatedVariables = updateVariableInArray(environment.variables, variableName, newValue);

      await reduxStore.dispatch(saveEnvironment(updatedVariables, collection.activeEnvironmentUid, collection.uid));
      return;
    }
  }

  throw new Error(`Environment variable '${variableName}' not found`);
};

const updateRuntimeVariable = async (variableName, newValue, options, cm, reduxStore) => {
  options.variables[variableName] = newValue;
  updateCodeMirrorState(cm, options.variables);

  const collectionUid = options.collectionUid;
  if (collectionUid) {
    await dispatchRuntimeVariableUpdate(reduxStore, collectionUid, variableName, newValue);
  }
};

const updateCollectionVariable = async (variableName, newValue, options, cm, reduxStore) => {
  const state = reduxStore.getState();
  const collections = state?.collections?.collections;
  if (!collections) {
    throw new Error('No collections found');
  }

  // Find the collection that contains this variable
  for (const collection of collections) {
    const collectionRequestVars = collection.root?.request?.vars?.req || [];
    const collectionVar = collectionRequestVars.find((v) => v.name === variableName && v.enabled);

    if (collectionVar) {
      // Import the action creator and update the variable
      await reduxStore.dispatch(updateCollectionVar({
        collectionUid: collection.uid,
        type: 'request',
        var: {
          ...collectionVar,
          value: newValue
        }
      }));

      // Also save the collection root to persist the change
      await reduxStore.dispatch(saveCollectionRoot(collection.uid));

      // Update the local options to reflect the change immediately
      if (options.variables) {
        options.variables[variableName] = newValue;
      }
      updateCodeMirrorState(cm, options.variables);

      return;
    }
  }

  throw new Error(`Collection variable '${variableName}' not found`);
};

const updateFolderVariable = async (variableName, newValue, options, cm, reduxStore) => {
  const state = reduxStore.getState();
  const collections = state?.collections?.collections;
  if (!collections) {
    throw new Error('No collections found');
  }

  // Find the folder that contains this variable
  for (const collection of collections) {
    const folderInfo = findFolderWithVariable(collection.items, variableName);

    if (folderInfo) {
      await reduxStore.dispatch(updateFolderVar({
        collectionUid: collection.uid,
        folderUid: folderInfo.folderUid,
        type: 'request',
        var: {
          ...folderInfo.variable,
          value: newValue
        }
      }));

      await reduxStore.dispatch(saveFolderRoot(collection.uid, folderInfo.folderUid));

      if (options.variables) {
        options.variables[variableName] = newValue;
      }
      updateCodeMirrorState(cm, options.variables);

      return;
    }
  }

  throw new Error(`Folder variable '${variableName}' not found`);
};

const findFolderWithVariable = (items, variableName) => {
  if (!items || !Array.isArray(items)) {
    return null;
  }

  for (const item of items) {
    if (item.type === 'folder') {
      const folderVars = item.root?.request?.vars?.req || [];
      const variable = folderVars.find((v) => v.name === variableName && v.enabled);

      if (variable) {
        return {
          folderUid: item.uid,
          variable
        };
      }

      // Recursively check nested folders
      const nestedResult = findFolderWithVariable(item.items, variableName);
      if (nestedResult) {
        return nestedResult;
      }
    }
  }

  return null;
};

const getActiveGlobalEnvironment = (state) => {
  const globalEnvironments = state?.globalEnvironments?.globalEnvironments;
  const activeGlobalEnvironmentUid = state?.globalEnvironments?.activeGlobalEnvironmentUid;

  return globalEnvironments?.find((env) => env?.uid === activeGlobalEnvironmentUid);
};

const getActiveEnvironment = (collection) => {
  if (!collection.activeEnvironmentUid || !collection.environments) {
    return null;
  }
  return collection.environments.find((env) => env.uid === collection.activeEnvironmentUid);
};

const updateVariableInArray = (variables, variableName, newValue) => {
  return variables.map((v) =>
    v.name === variableName ? { ...v, value: newValue } : v);
};

const updateCodeMirrorState = (cm, variables) => {
  if (cm?.state?.brunoVarInfo) {
    cm.state.brunoVarInfo.options.variables = variables;
  }
};

const dispatchRuntimeVariableUpdate = async (reduxStore, collectionUid, variableName, variableValue) => {
  await reduxStore.dispatch(updateRuntimeVariableAction({
    collectionUid,
    variableName,
    variableValue
  }));
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
      options: options instanceof Function ? { render: options } : options === true ? {} : options,
      currentPopup: null,
      currentVariableElement: null
    };
  }

  function getHoverTime(cm) {
    const options = cm.state.brunoVarInfo.options;
    return (options && options.hoverTime) || 50;
  }

  function onMouseOver(cm, e) {
    const state = cm.state.brunoVarInfo;
    const target = e.target || e.srcElement;

    if (target.nodeName !== 'SPAN') {
      return;
    }
    if (!target.classList.contains('cm-variable-valid')) {
      return;
    }

    // If we're already showing a popup for a different variable, recreate it
    if (state.currentPopup && state.currentVariableElement !== target) {
      const freshBox = target.getBoundingClientRect();
      const pos = cm.coordsChar({
        left: (freshBox.left + freshBox.right) / 2,
        top: (freshBox.top + freshBox.bottom) / 2
      });
      const token = cm.getTokenAt(pos, true);
      if (token) {
        const brunoVarInfo = renderVarInfo(token, state.options, cm, pos);
        if (brunoVarInfo) {
          // Recreate popup for the new variable (this will remove old one and create new)
          showPopup(cm, freshBox, brunoVarInfo);
        }
      }
      return;
    }

    if (state.hoverTimeout !== undefined) {
      return;
    }

    // Store reference to the target element for position updates
    state.currentVariableElement = target;
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
      state.currentVariableElement = null;
    };

    const onHover = function () {
      CodeMirror.off(document, 'mousemove', onMouseMove);
      CodeMirror.off(cm.getWrapperElement(), 'mouseout', onMouseOut);
      state.hoverTimeout = undefined;
      // Get fresh box position from the stored element
      const freshBox = state.currentVariableElement ? state.currentVariableElement.getBoundingClientRect() : box;
      onMouseHover(cm, freshBox);
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
      const brunoVarInfo = renderVarInfo(token, options, cm, pos);
      if (brunoVarInfo) {
        // Get fresh box position from the current variable element
        const freshBox = state.currentVariableElement ? state.currentVariableElement.getBoundingClientRect() : box;
        showPopup(cm, freshBox, brunoVarInfo);
      }
    }
  }

  function showPopup(cm, box, brunoVarInfo) {
    const state = cm.state.brunoVarInfo;

    // Remove existing popup if any
    if (state.currentPopup && state.currentPopup.parentNode) {
      state.currentPopup.parentNode.removeChild(state.currentPopup);
    }

    const popup = document.createElement('div');
    popup.className = 'CodeMirror-brunoVarInfo';
    popup.appendChild(brunoVarInfo);
    document.body.appendChild(popup);

    // Store reference to current popup
    state.currentPopup = popup;

    // Function to update popup position
    const updatePosition = (useBox = null) => {
      // Use provided box, or get from current variable element, or fallback to original box
      let targetBox = useBox;
      if (!targetBox && state.currentVariableElement) {
        targetBox = state.currentVariableElement.getBoundingClientRect();
      }
      if (!targetBox) {
        targetBox = box;
      }

      if (!popup.parentNode) {
        return;
      }

    const popupBox = popup.getBoundingClientRect();
    const popupStyle = popup.currentStyle || window.getComputedStyle(popup);
      const popupWidth
        = popupBox.right - popupBox.left + parseFloat(popupStyle.marginLeft) + parseFloat(popupStyle.marginRight);
      const popupHeight
        = popupBox.bottom - popupBox.top + parseFloat(popupStyle.marginTop) + parseFloat(popupStyle.marginBottom);

      // Smart positioning: try below first, then above if no space
      let topPos = targetBox.bottom + 5;
      if (popupHeight > window.innerHeight - targetBox.bottom - 15 && targetBox.top > window.innerHeight - targetBox.bottom) {
        topPos = targetBox.top - popupHeight - 5;
    }

      // If still doesn't fit, position at top of viewport
    if (topPos < 0) {
        topPos = 10;
    }

    // Horizontal positioning: try to center on the variable, but stay within viewport
      let leftPos = targetBox.left + (targetBox.width / 2) - (popupWidth / 2);

    // Ensure it doesn't go off the left edge
      const minLeftMargin = 50;
      if (leftPos < minLeftMargin) {
        leftPos = minLeftMargin;
    }

    // Ensure it doesn't go off the right edge
    if (leftPos + popupWidth > window.innerWidth - 10) {
      leftPos = window.innerWidth - popupWidth - 10;
    }

    popup.style.top = topPos + 'px';
    popup.style.left = leftPos + 'px';
    };

    // Store updatePosition function on popup for external updates
    popup._updatePosition = updatePosition;

    // Initial position using the provided box
    updatePosition(box);

    // Update position on scroll
    const onScroll = () => {
      if (state.currentVariableElement && popup.parentNode) {
        updatePosition();
      }
    };

    // Update position on window resize
    const onResize = () => {
      if (state.currentVariableElement && popup.parentNode) {
        updatePosition();
      }
    };

    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);

    // Store cleanup functions
    popup._cleanup = () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };

    popup.style.opacity = 1;

    let popupTimeout;

    const onMouseOverPopup = function () {
      clearTimeout(popupTimeout);
    };

    const onMouseOut = function () {
      clearTimeout(popupTimeout);
      popupTimeout = setTimeout(hidePopup, 200);
    };

    const hidePopup = function () {
      // Auto-save any editable textareas before closing
      const textareas = popup.querySelectorAll('.edit-textarea');
      textareas.forEach((textarea) => {
        if (textarea._saveFunction) {
          textarea._saveFunction();
        }
      });

      // Clean up event listeners
      if (popup._cleanup) {
        popup._cleanup();
      }

      CodeMirror.off(popup, 'mouseover', onMouseOverPopup);
      CodeMirror.off(popup, 'mouseout', onMouseOut);
      CodeMirror.off(cm.getWrapperElement(), 'mouseout', onMouseOut);

      // Clear state references
      state.currentPopup = null;
      state.currentVariableElement = null;

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
    variableValue = interpolate(get(variables, variableName), variables);
  } else if (str.startsWith('/:')) {
    variableName = str.replace('/:', '').trim();
    variableValue = variables?.pathParams?.[variableName];
  } else {
    // direct variable reference (e.g., for numeric values in JSON mode or plain variable names)
    variableName = str;
    variableValue = interpolate(get(variables, variableName), variables);
  }

  return { variableName, variableValue };
};
