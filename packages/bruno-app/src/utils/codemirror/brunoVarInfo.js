/**
 *  Copyright (c) 2017, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file at https://github.com/graphql/codemirror-graphql/tree/v0.8.3
 */

let CodeMirror;
const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;
const { get } = require('lodash');

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');

  const renderTextInfo = (text) => {
    const into = document.createElement('div');
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'info-description';

    descriptionDiv.appendChild(document.createTextNode(text));
    into.appendChild(descriptionDiv);

    return into;
  };

  const renderVarInfo = (token, options, cm, pos) => {
    const str = token.string || '';
    if (!str || !str.length || typeof str !== 'string') {
      return;
    }
    // str is of format {{variableName}}, extract variableName
    // we are seeing that from the gql query editor, the token string is of format variableName
    const variableName = str.replace('{{', '').replace('}}', '').trim();
    const variableValue = get(options.variables, variableName);

    const into = document.createElement('div');
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'info-description';

    descriptionDiv.appendChild(document.createTextNode(variableValue));
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
    if (!target.classList.contains('cm-variable-valid') && !target.classList.contains('cm-variable-vault')) {
      return;
    }

    const box = target.getBoundingClientRect();

    const hoverTime = getHoverTime(cm);
    state.hoverTimeout = setTimeout(onHover, hoverTime);

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

    CodeMirror.on(document, 'mousemove', onMouseMove);
    CodeMirror.on(cm.getWrapperElement(), 'mouseout', onMouseOut);
  }

  async function onMouseHover(cm, box) {
    const pos = cm.coordsChar({
      left: (box.left + box.right) / 2,
      top: (box.top + box.bottom) / 2
    });

    const state = cm.state.brunoVarInfo;
    const options = state.options;
    const token = cm.getTokenAt(pos, true);
    if (token) {
      if (token.type.startsWith('variable-vault')) {
        const match = token.string.match(/vault\s?\|(?<path>[^|]*)(\s?\|(?<jsonPath>[^|}]*))?/);
        if (!match) {
          showPopup(cm, box, renderTextInfo(`Invalid vault variable, must be in the format: {{vault|path|jsonPath}}`));

          return;
        } else {
          const { path, jsonPath } = match.groups;

          const body = {
            env: cm.state.brunoVarInfo.options.variables,
            path,
            jsonPath
          };
          const response = await fetch('/api/vault', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          });

          if (response.status !== 200) {
            if (response.status === 400) {
              const responseData = await response.json();
              const { error } = responseData;
              showPopup(cm, box, renderTextInfo(error));
              return;
            }

            showPopup(
              cm,
              box,
              renderTextInfo(
                `Could not get data from Vault. Check your VAULT_ADDR and VAULT_TOKEN_FILE_PATH environment variables.`
              )
            );
            return;
          }

          const responseData = await response.json();
          const { value } = responseData;

          showPopup(
            cm,
            box,
            renderTextInfo(
              value ? value : `Could not find value at path: ${path} ${jsonPath ? `with jsonPath: ${jsonPath}` : ''}`
            ),
            value
              ? {
                  html: '&#x21bb;',
                  title: 'Refresh variable',
                  handler: (element) => {
                    fetch('/api/vault', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        ...body,
                        action: 'clear'
                      })
                    }).finally(() => {
                      // Simulate mouseout event to hide popup
                      element.dispatchEvent(
                        new MouseEvent('mouseout', {
                          view: window,
                          bubbles: true,
                          cancelable: true
                        })
                      );
                    });
                  }
                }
              : null
          );
          return;
        }
      }

      const brunoVarInfo = renderVarInfo(token, options, cm, pos);
      if (brunoVarInfo) {
        showPopup(cm, box, brunoVarInfo);
      }
    }
  }

  function addButton(element, config) {
    if (!config) {
      return;
    }

    if ((!config.html && !config.text) || !config.handler) {
      console.error('Invalid action passed to showPopup');
      return;
    }

    const button = document.createElement('button');
    button.className = 'refresh-button';

    if (config.text) {
      button.innerText = config.text;
    } else {
      button.innerHTML = config.html;
    }

    button.addEventListener('click', () => config.handler(element));
    button.classList.add('btn', 'btn-VarInfo');
    if (config.title) {
      button.title = config.title;
    }
    element.classList.add('with-button');
    element.appendChild(button);
  }

  function showPopup(cm, box, brunoVarInfo, buttonConfig) {
    const popup = document.createElement('div');
    popup.className = 'CodeMirror-brunoVarInfo';
    popup.appendChild(brunoVarInfo);
    addButton(popup, buttonConfig);
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
