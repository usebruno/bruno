/**
 *  Copyright (c) 2017, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file at https://github.com/graphql/codemirror-graphql/tree/v0.8.3
 */

import { interpolate } from '@usebruno/common';
import { store } from 'providers/ReduxStore';

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

  const contentDiv = document.createElement('div');
  contentDiv.style.display = 'flex';
  contentDiv.style.alignItems = 'center';
  contentDiv.style.gap = '8px';
  contentDiv.className = 'info-content';

  const descriptionDiv = document.createElement('div');
  descriptionDiv.className = 'info-description';
  descriptionDiv.style.flex = '1';

  if (options?.variables?.maskedEnvVariables?.includes(variableName)) {
    descriptionDiv.appendChild(document.createTextNode('*****'));
  } else {
    descriptionDiv.appendChild(document.createTextNode(variableValue));
  }

  const copyButton = getCopyButton(variableValue);

  contentDiv.appendChild(descriptionDiv);
  contentDiv.appendChild(copyButton);
  into.appendChild(contentDiv);

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
      options: options instanceof Function ? { render: options } : options === true ? {} : options,
      currentPopup: null
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
    // TEMPORARILY DISABLED FOR STYLE TESTING - prevents popup from disappearing
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
    let leftPos = box.left + (box.width / 2) - (popupWidth / 2);

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
      popupTimeout = setTimeout(hidePopup, 300); // Increased timeout for better UX
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
    // TEMPORARILY DISABLED FOR STYLE TESTING - prevents popup from disappearing
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
