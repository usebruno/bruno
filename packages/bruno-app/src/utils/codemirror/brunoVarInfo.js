/**
 *  Copyright (c) 2017, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file at https://github.com/graphql/codemirror-graphql/tree/v0.8.3
 */

import { interpolate } from '@usebruno/common';
import { store } from "providers/ReduxStore";

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
  copyButton.style.color = 'inherit';
  copyButton.style.cursor = 'pointer';
  copyButton.style.padding = '2px';
  copyButton.style.opacity = '0.7';
  copyButton.style.transition = 'opacity 0.2s ease';
  copyButton.style.display = 'flex';
  copyButton.style.alignItems = 'center';
  copyButton.style.justifyContent = 'flex-end';

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
          copyButton.style.color = 'inherit';
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

  const contentDiv = document.createElement('div');
  contentDiv.style.display = 'flex';
  contentDiv.style.alignItems = 'center';
  contentDiv.style.gap = '8px';
  contentDiv.className = 'info-content';

  appendVariableHeader(into, variableName, options);  
  appendVariableValue(into, variableName, variableValue, options, cm);

  into.appendChild(contentDiv);
  return into;
};

const appendVariableHeader = (container, variableName, options) => {
    const variableType = getVariableType(variableName, options);
    const headerDiv = document.createElement('div');
    headerDiv.className = 'info-name';
    headerDiv.textContent = `${variableName} (${variableType})`;
    container.appendChild(headerDiv);
  };

const appendVariableValue = (container, variableName, variableValue, options, cm) => {
    const variableType = getVariableType(variableName, options);
    const isEditable = isVariableEditable(variableType);
    const isMasked = isVariableMasked(variableName, options);
    
    const valueContainer = createValueContainer(variableValue, isMasked, isEditable);
    container.appendChild(valueContainer);
    
    if (isEditable && !isMasked) {
      const editControls = createEditControls(variableName, variableValue, options, cm, valueContainer);
      container.appendChild(editControls);
    } else if (!isEditable) {
      container.appendChild(createReadOnlyInfo());
    }
  };

  const isVariableEditable = (variableType) => {
    return ['global', 'environment', 'collection', 'folder'].includes(variableType);
  };

  const isVariableMasked = (variableName, options) => {
    return options?.variables?.maskedEnvVariables?.includes(variableName);
  };

  const createValueContainer = (variableValue, isMasked, isEditable) => {
    const valueContainer = document.createElement('div');
    valueContainer.className = 'value-container';
    
    const displayValue = isMasked ? '*****' : variableValue;
    const descriptionDiv = createValueDisplay(displayValue);
    valueContainer.appendChild(descriptionDiv);

    const copyButton = getCopyButton(variableValue);
    valueContainer.appendChild(copyButton);
    
    if (isEditable && !isMasked) {
      const editInput = createEditInput(variableValue);
      valueContainer.appendChild(editInput);
    }
    
    return valueContainer;
  };

  const createValueDisplay = (displayValue) => {
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'info-description';
    descriptionDiv.appendChild(document.createTextNode(displayValue));
    return descriptionDiv;
  };

  const createEditInput = (variableValue) => {
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input hidden';
    editInput.value = variableValue;
    return editInput;
  };

  const createEditControls = (variableName, variableValue, options, cm, valueContainer) => {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    
    const editButton = createButton('Edit', 'edit-btn');
    const saveButton = createButton('Save', 'save-btn hidden');
    const cancelButton = createButton('Cancel', 'cancel-btn hidden');
    
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    
    setupEditFunctionality(
      variableName, 
      variableValue, 
      options, 
      cm, 
      valueContainer, 
      editButton, 
      saveButton, 
      cancelButton
    );
    
    return buttonContainer;
  };

  const createButton = (text, className) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = className;
    return button;
  };

  const createReadOnlyInfo = () => {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'read-only-info';
    infoDiv.textContent = 'Read-only variable';
    return infoDiv;
  };

  const setupEditFunctionality = (variableName, variableValue, options, cm, valueContainer, editButton, saveButton, cancelButton) => {
    const descriptionDiv = valueContainer.querySelector('.info-description');
    const editInput = valueContainer.querySelector('.edit-input');
    const originalValue = variableValue;
    
    const editMode = createEditModeController(descriptionDiv, editInput, editButton, saveButton, cancelButton);
    
    setupEditEventListeners(
      variableName, 
      originalValue, 
      options, 
      cm, 
      valueContainer, 
      descriptionDiv, 
      editInput, 
      editButton, 
      saveButton, 
      cancelButton, 
      editMode
    );
  };

  const createEditModeController = (descriptionDiv, editInput, editButton, saveButton, cancelButton) => {
    return {
      enter: () => {
        descriptionDiv.className = 'info-description hidden';
        editInput.className = 'edit-input';
        editInput.focus();
        editInput.select();
        
        editButton.className = 'edit-btn hidden';
        saveButton.className = 'save-btn visible';
        cancelButton.className = 'cancel-btn visible';
      },
      
      exit: () => {
        descriptionDiv.className = 'info-description';
        editInput.className = 'edit-input hidden';
        
        editButton.className = 'edit-btn visible';
        saveButton.className = 'save-btn hidden';
        cancelButton.className = 'cancel-btn hidden';
      }
    };
  };

  const setupEditEventListeners = (variableName, originalValue, options, cm, valueContainer, descriptionDiv, editInput, editButton, saveButton, cancelButton, editMode) => {
    const saveValue = async () => {
      const newValue = editInput.value;
      try {
        await updateVariableValue(variableName, newValue, options, cm);
        descriptionDiv.textContent = newValue;
        editMode.exit();
        showFeedback(valueContainer, 'Saved!', 'success', 2000);
      } catch (error) {
        showFeedback(valueContainer, error.message || 'Failed to save', 'error', 4000);
      }
    };

    const cancelEdit = () => {
      editInput.value = originalValue;
      editMode.exit();
    };

    editButton.addEventListener('click', (e) => {
      e.stopPropagation();
      editMode.enter();
    });

    saveButton.addEventListener('click', (e) => {
      e.stopPropagation();
      saveValue();
    });

    cancelButton.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelEdit();
    });

    editInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        saveValue();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    });
  };

  const showFeedback = (container, message, type, duration) => {
    const feedbackMsg = document.createElement('div');
    feedbackMsg.textContent = message;
    feedbackMsg.className = `feedback-message ${type}`;
    container.appendChild(feedbackMsg);
    setTimeout(() => feedbackMsg.remove(), duration);
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
    const activeGlobalEnv = globalEnvironments?.find(env => env?.uid === activeGlobalEnvironmentUid);
    if (activeGlobalEnv?.variables?.some(v => v.name === variableName)) {
      return 'global';
    }

    // Check collection environments
    if (collections) {
      for (const collection of collections) {
        if (collection.activeEnvironmentUid && collection.environments) {
          const environment = collection.environments.find(env => env.uid === collection.activeEnvironmentUid);
          if (environment?.variables?.some(v => v.name === variableName)) {
            return 'environment';
          }
        }
      }
    }

    // Check collection variables
    if (collections) {
      for (const collection of collections) {
        if (collection.root?.request?.vars?.req?.some(v => v.name === variableName)) {
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
        if (folderVars.some(v => v.name === variableName && v.enabled)) {
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
    
    const globalVar = activeGlobalEnv.variables?.find(v => v.name === variableName);
    if (!globalVar) {
      throw new Error(`Global variable '${variableName}' not found`);
    }
    
    const updatedVariables = updateVariableInArray(activeGlobalEnv.variables, variableName, newValue);
    
    const { saveGlobalEnvironment } = await import('providers/ReduxStore/slices/global-environments');
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
      
      const envVar = environment.variables?.find(v => v.name === variableName && v.enabled);
      if (envVar) {
        const updatedVariables = updateVariableInArray(environment.variables, variableName, newValue);
        
        const { saveEnvironment } = await import('providers/ReduxStore/slices/collections/actions');
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
      const collectionVar = collectionRequestVars.find(v => v.name === variableName && v.enabled);
      
      if (collectionVar) {
        // Import the action creator and update the variable
        const { updateCollectionVar } = await import('providers/ReduxStore/slices/collections');
        await reduxStore.dispatch(updateCollectionVar({
          collectionUid: collection.uid,
          type: 'request',
          var: {
            ...collectionVar,
            value: newValue
          }
        }));
        
        // Also save the collection root to persist the change
        const { saveCollectionRoot } = await import('providers/ReduxStore/slices/collections/actions');
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
        const { updateFolderVar } = await import('providers/ReduxStore/slices/collections');
        await reduxStore.dispatch(updateFolderVar({
          collectionUid: collection.uid,
          folderUid: folderInfo.folderUid,
          type: 'request',
          var: {
            ...folderInfo.variable,
            value: newValue
          }
        }));
        
        const { saveFolderRoot } = await import('providers/ReduxStore/slices/collections/actions');
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
        const variable = folderVars.find(v => v.name === variableName && v.enabled);
        
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
    
    return globalEnvironments?.find(env => env?.uid === activeGlobalEnvironmentUid);
  };

  const getActiveEnvironment = (collection) => {
    if (!collection.activeEnvironmentUid || !collection.environments) {
      return null;
    }
    
    return collection.environments.find(env => env.uid === collection.activeEnvironmentUid);
  };

  const updateVariableInArray = (variables, variableName, newValue) => {
    return variables.map(v => 
      v.name === variableName ? { ...v, value: newValue } : v
    );
  };

  const updateCodeMirrorState = (cm, variables) => {
    if (cm?.state?.brunoVarInfo) {
      cm.state.brunoVarInfo.options.variables = variables;
    }
  };

  const dispatchRuntimeVariableUpdate = async (reduxStore, collectionUid, variableName, variableValue) => {
    const { updateRuntimeVariable } = await import('providers/ReduxStore/slices/collections');
    await reduxStore.dispatch(updateRuntimeVariable({
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
    if (!target.classList.contains('cm-variable-valid')) {
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
      const brunoVarInfo = renderVarInfo(token, options, cm, pos);
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

    // Smart positioning: try below first, then above if no space
    let topPos = box.bottom + 5;
    if (popupHeight > window.innerHeight - box.bottom - 15 && box.top > window.innerHeight - box.bottom) {
      topPos = box.top - popupHeight - 5;
    }

    // If still doesn't fit, position at top of viewport
    if (topPos < 0) {
      topPos = 10;
    }

    // Horizontal positioning: try to center on the variable, but stay within viewport
    let leftPos = box.left + (box.width / 2) - (popupWidth / 2);
    
    // Ensure it doesn't go off the left edge
    if (leftPos < 10) {
      leftPos = 10;
    }
    
    // Ensure it doesn't go off the right edge
    if (leftPos + popupWidth > window.innerWidth - 10) {
      leftPos = window.innerWidth - popupWidth - 10;
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
      popupTimeout = setTimeout(hidePopup, 300); // Increased timeout for better UX
    };

    const hidePopup = function () {
      CodeMirror.off(popup, 'mouseover', onMouseOverPopup);
      CodeMirror.off(popup, 'mouseout', onMouseOut);
      CodeMirror.off(cm.getWrapperElement(), 'mouseout', onMouseOut);

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
