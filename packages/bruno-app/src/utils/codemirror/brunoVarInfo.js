/**
 *  Copyright (c) 2017, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file at https://github.com/graphql/codemirror-graphql/tree/v0.8.3
 */

// Todo: Fix this
// import { interpolate } from '@usebruno/common';
import brunoCommon from '@usebruno/common';
const { interpolate } = brunoCommon;

let CodeMirror;
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;
const { get } = require('lodash');

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');

  const renderVarInfo = (token, options, cm, pos) => {
    const str = token.string || '';
    if (!str || !str.length || typeof str !== 'string') {
      return;
    }

    // str is of format {{variableName}} or :variableName, extract variableName
    let variableName;
    let variableValue;

    if (str.startsWith('{{')) {
      variableName = str.replace('{{', '').replace('}}', '').trim();
      variableValue = interpolate(get(options.variables, variableName), options.variables);
    } else if (str.startsWith('/:')) {
      variableName = str.replace('/:', '').trim();
      variableValue =
        options.variables && options.variables.pathParams ? options.variables.pathParams[variableName] : undefined;
    }

    if (variableValue === undefined) {
      return;
    }

    const into = document.createElement('div');
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'info-description';
    if (options?.variables?.maskedEnvVariables?.includes(variableName)) {
      descriptionDiv.appendChild(document.createTextNode('*****'));
    } else {
      descriptionDiv.appendChild(document.createTextNode(variableValue));
    }
    into.appendChild(descriptionDiv);

    return into;
  };

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

    let topPos = box.bottom;
    if (popupHeight > window.innerHeight - box.bottom - 15 && box.top > window.innerHeight - box.bottom) {
      topPos = box.top - popupHeight;
    }

    if (topPos < 0) {
      topPos = box.bottom;
    }

    // make popup appear on top of cursor
    if (topPos > 70) {
      topPos = topPos - 70;
    }

    let leftPos = Math.max(0, window.innerWidth - popupWidth - 15);
    if (leftPos > box.left) {
      leftPos = box.left;
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
      popupTimeout = setTimeout(hidePopup, 200);
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
