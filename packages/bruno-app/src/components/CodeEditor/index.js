/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React, { createRef } from 'react';
import { isEqual, escapeRegExp } from 'lodash';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import { setupAutoComplete, showRootHints } from 'utils/codemirror/autocomplete';
import StyledWrapper from './StyledWrapper';
import * as jsonlint from '@prantlf/jsonlint';
import { JSHINT } from 'jshint';
import stripJsonComments from 'strip-json-comments';
import { getAllVariables } from 'utils/collections';
import { setupLinkAware } from 'utils/codemirror/linkAware';
import { setupLintErrorTooltip } from 'utils/codemirror/lint-errors';
import CodeMirrorSearch from 'components/CodeMirrorSearch/index';

import { getKeyBindingsForActionAllOS } from 'providers/Hotkeys/keyMappings';
import store from 'providers/ReduxStore/index';
import { reorderTabs, switchTab } from 'providers/ReduxStore/slices/tabs';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';

const CodeMirror = require('codemirror');
window.jsonlint = jsonlint;
window.JSHINT = JSHINT;

const TAB_SIZE = 2;

export default class CodeEditor extends React.Component {
  constructor(props) {
    super(props);

    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.variables = {};
    this.searchResultsCountElementId = 'search-results-count';
    this.searchBarRef = createRef();

    this.lintOptions = {
      esversion: 11,
      expr: true,
      asi: true,
      highlightLines: true
    };

    // hotkey maps management
    this._unsubscribeStore = null;

    this._closeTabKeyMap = null;
    this._sendRequestKeyMap = null;
    this._prevTabKeyMap = null;
    this._nextTabKeyMap = null;
    this._moveLeftTabKeyMap = null;
    this._moveRightTabKeyMap = null;
    this._changeLayoutKeyMap = null;
    this._collapseSidebarKeyMap = null;

    this._lastCloseTabKeySig = null;
    this._lastSendRequestKeySig = null;
    this._lastPrevTabKeySig = null;
    this._lastNextTabKeySig = null;
    this._lastMoveLeftTabKeySig = null;
    this._lastMoveRightTabKeySig = null;
    this._lastChangeLayoutKeySig = null;
    this._lastCollapseSidebarKeySig = null;

    this.state = {
      searchBarVisible: false
    };
  }

  // same converter as other editors
  convertToCodeMirrorFormat = (combo) => {
    if (!combo || typeof combo !== 'string') return null;

    const normalized = combo
      .replace(/-/g, '+')
      .split('+')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => p.toLowerCase() !== 'bind') // remove bind tokens
      .join('+');

    const parts = normalized.split('+').map((p) => p.trim()).filter(Boolean);

    const out = parts.map((key) => {
      const lower = key.toLowerCase();

      if (lower === 'command' || lower === 'cmd') return 'Cmd';
      if (lower === 'control' || lower === 'ctrl') return 'Ctrl';
      if (lower === 'option' || lower === 'alt') return 'Alt';
      if (lower === 'shift') return 'Shift';
      if (lower === 'mod') return 'Mod';

      if (lower === 'enter' || lower === 'return') return 'Enter';
      if (lower === 'esc' || lower === 'escape') return 'Esc';
      if (lower === 'space') return 'Space';
      if (lower === 'tab') return 'Tab';
      if (lower === 'backspace') return 'Backspace';
      if (lower === 'delete' || lower === 'del') return 'Delete';
      if (lower === 'up') return 'Up';
      if (lower === 'down') return 'Down';
      if (lower === 'left') return 'Left';
      if (lower === 'right') return 'Right';

      if (key.length === 1) return key.toUpperCase();
      return key.charAt(0).toUpperCase() + key.slice(1);
    });

    return out.join('-');
  };

  _applyActionKeyMap = ({ actionName, handler, mapName, getSig, setSig, getMap, setMap }) => {
    if (!this.editor) return;

    const oldMap = getMap();
    if (oldMap) {
      try {
        this.editor.removeKeyMap(oldMap);
      } catch (e) {}
      setMap(null);
    }

    let combos = [];
    try {
      const state = store.getState();
      const userKeyBindings = state.app.preferences?.keyBindings || {};
      combos = getKeyBindingsForActionAllOS(actionName, userKeyBindings) || [];
    } catch (e) {
      combos = [];
    }

    const cmCombos = combos.map((k) => this.convertToCodeMirrorFormat(k)).filter(Boolean);
    const sig = cmCombos.join('|');
    setSig(sig);

    if (!cmCombos.length) return;

    const cmHandler = () => {
      handler?.();
      return true;
    };

    const keyMap = { name: mapName };
    cmCombos.forEach((cmKey) => {
      keyMap[cmKey] = cmHandler;
    });

    setMap(keyMap);
    this.editor.addKeyMap(keyMap);
  };

  _applyCloseTabKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'closeTab',
      mapName: 'codeEditor.closeTab',
      handler: () => window.dispatchEvent(new CustomEvent('close-active-tab')),
      getSig: () => this._lastCloseTabKeySig,
      setSig: (v) => (this._lastCloseTabKeySig = v),
      getMap: () => this._closeTabKeyMap,
      setMap: (m) => (this._closeTabKeyMap = m)
    });
  };

  _applySendRequestKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'sendRequest',
      mapName: 'codeEditor.sendRequest',
      handler: () => {
        if (this.props.onRun) this.props.onRun();
      },
      getSig: () => this._lastSendRequestKeySig,
      setSig: (v) => (this._lastSendRequestKeySig = v),
      getMap: () => this._sendRequestKeyMap,
      setMap: (m) => (this._sendRequestKeyMap = m)
    });
  };

  _applySwitchPrevTabKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'switchToPreviousTab',
      mapName: 'codeEditor.switchToPreviousTab',
      handler: () => {
        store.dispatch(switchTab({ direction: 'pageup' }));
      },
      getSig: () => this._lastPrevTabKeySig,
      setSig: (v) => (this._lastPrevTabKeySig = v),
      getMap: () => this._prevTabKeyMap,
      setMap: (m) => (this._prevTabKeyMap = m)
    });
  };

  _applySwitchNextTabKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'switchToNextTab',
      mapName: 'codeEditor.switchToNextTab',
      handler: () => {
        store.dispatch(switchTab({ direction: 'pagedown' }));
      },
      getSig: () => this._lastNextTabKeySig,
      setSig: (v) => (this._lastNextTabKeySig = v),
      getMap: () => this._nextTabKeyMap,
      setMap: (m) => (this._nextTabKeyMap = m)
    });
  };

  _applyMoveTabLeftKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'moveTabLeft',
      mapName: 'codeEditor.moveTabLeft',
      handler: () => {
        store.dispatch(reorderTabs({ direction: -1 }));
      },
      getSig: () => this._lastMoveLeftTabKeySig,
      setSig: (v) => (this._lastMoveLeftTabKeySig = v),
      getMap: () => this._moveLeftTabKeyMap,
      setMap: (m) => (this._moveLeftTabKeyMap = m)
    });
  };

  _applyMoveTabRightKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'moveTabRight',
      mapName: 'codeEditor.moveTabRight',
      handler: () => {
        store.dispatch(reorderTabs({ direction: 1 }));
      },
      getSig: () => this._lastMoveRightTabKeySig,
      setSig: (v) => (this._lastMoveRightTabKeySig = v),
      getMap: () => this._moveRightTabKeyMap,
      setMap: (m) => (this._moveRightTabKeyMap = m)
    });
  };

  _applyChangeLayoutKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'changeLayout',
      mapName: 'codeEditor.changeLayout',
      handler: () => {
        const state = store.getState();
        const preferences = state.app.preferences;
        const currentOrientation = preferences?.layout?.responsePaneOrientation || 'horizontal';
        const newOrientation = currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        const updatedPreferences = {
          ...preferences,
          layout: {
            ...preferences.layout,
            responsePaneOrientation: newOrientation
          }
        };
        store.dispatch(savePreferences(updatedPreferences));
      },
      getSig: () => this._lastChangeLayoutKeySig,
      setSig: (v) => (this._lastChangeLayoutKeySig = v),
      getMap: () => this._changeLayoutKeyMap,
      setMap: (m) => (this._changeLayoutKeyMap = m)
    });
  };

  _applyCollapseSidebarKeyMap = () => {
    this._applyActionKeyMap({
      actionName: 'collapseSidebar',
      mapName: 'codeEditor.collapseSidebar',
      handler: () => {
        store.dispatch(toggleSidebarCollapse());
      },
      getSig: () => this._lastCollapseSidebarKeySig,
      setSig: (v) => (this._lastCollapseSidebarKeySig = v),
      getMap: () => this._collapseSidebarKeyMap,
      setMap: (m) => (this._collapseSidebarKeyMap = m)
    });
  };

  _applyAllHotkeyMaps = () => {
    this._applyCloseTabKeyMap();
    this._applySendRequestKeyMap();
    this._applySwitchPrevTabKeyMap();
    this._applySwitchNextTabKeyMap();
    this._applyMoveTabLeftKeyMap();
    this._applyMoveTabRightKeyMap();
    this._applyChangeLayoutKeyMap();
    this._applyCollapseSidebarKeyMap();
  };

  componentDidMount() {
    const variables = getAllVariables(this.props.collection, this.props.item);

    const editor = (this.editor = CodeMirror(this._node, {
      value: this.props.value || '',
      placeholder: '...',
      lineNumbers: true,
      lineWrapping: this.props.enableLineWrapping ?? true,
      tabSize: TAB_SIZE,
      mode: this.props.mode || 'application/ld+json',
      brunoVarInfo: this.props.enableBrunoVarInfo !== false ? {
        variables,
        collection: this.props.collection,
        item: this.props.item
      } : false,
      keyMap: 'sublime',
      autoCloseBrackets: true,
      matchBrackets: true,
      showCursorWhenSelecting: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      lint: this.lintOptions,
      readOnly: this.props.readOnly,
      scrollbarStyle: 'overlay',
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      extraKeys: {
        // 'Cmd-Enter': () => {
        //   if (this.props.onRun) {
        //     this.props.onRun();
        //   }
        // },
        // 'Ctrl-Enter': () => {
        //   if (this.props.onRun) {
        //     this.props.onRun();
        //   }
        // },
        'Cmd-S': () => {
          if (this.props.onSave) {
            this.props.onSave();
          }
        },
        'Ctrl-S': () => {
          if (this.props.onSave) {
            this.props.onSave();
          }
        },
        'Cmd-F': (cm) => {
          this.setState({ searchBarVisible: true }, () => {
            this.searchBarRef.current?.focus();
          });
        },
        'Ctrl-F': (cm) => {
          this.setState({ searchBarVisible: true }, () => {
            this.searchBarRef.current?.focus();
          });
        },
        'Cmd-H': 'replace',
        'Ctrl-H': 'replace',
        'Tab': function (cm) {
          cm.getSelection().includes('\n') || editor.getLine(cm.getCursor().line) == cm.getSelection()
            ? cm.execCommand('indentMore')
            : cm.replaceSelection('  ', 'end');
        },
        'Shift-Tab': 'indentLess',
        'Ctrl-Space': (cm) => {
          showRootHints(cm, this.props.showHintsFor);
        },
        'Cmd-Space': (cm) => {
          showRootHints(cm, this.props.showHintsFor);
        },
        'Ctrl-Y': 'foldAll',
        'Cmd-Y': 'foldAll',
        'Ctrl-I': 'unfoldAll',
        'Cmd-I': 'unfoldAll',
        'Ctrl-/': () => {
          if (['application/ld+json', 'application/json'].includes(this.props.mode)) {
            this.editor.toggleComment({ lineComment: '//', blockComment: '/*' });
          } else {
            this.editor.toggleComment();
          }
        },
        'Cmd-/': () => {
          if (['application/ld+json', 'application/json'].includes(this.props.mode)) {
            this.editor.toggleComment({ lineComment: '//', blockComment: '/*' });
          } else {
            this.editor.toggleComment();
          }
        },
        'Esc': () => {
          if (this.state.searchBarVisible) {
            this.setState({ searchBarVisible: false });
          }
        }
      },
      foldOptions: {
        widget: (from, to) => {
          var count = undefined;
          var internal = this.editor.getRange(from, to);
          if (this.props.mode == 'application/ld+json') {
            if (this.editor.getLine(from.line).endsWith('[')) {
              var toParse = '[' + internal + ']';
            } else var toParse = '{' + internal + '}';
            try {
              count = Object.keys(JSON.parse(toParse)).length;
            } catch (e) {}
          } else if (this.props.mode == 'application/xml') {
            var doc = new DOMParser();
            try {
              // add header element and remove prefix namespaces for DOMParser
              var dcm = doc.parseFromString(
                '<a> ' + internal.replace(/(?<=\<|<\/)\w+:/g, '') + '</a>',
                'application/xml'
              );
              count = dcm.documentElement.children.length;
            } catch (e) {}
          }
          return count ? `\u21A4${count}\u21A6` : '\u2194';
        }
      }
    }));
    CodeMirror.registerHelper('lint', 'json', function (text) {
      let found = [];
      if (!window.jsonlint) {
        if (window.console) {
          window.console.error('Error: window.jsonlint not defined, CodeMirror JSON linting cannot run.');
        }
        return found;
      }
      let jsonlint = window.jsonlint.parser || window.jsonlint;
      try {
        jsonlint.parse(stripJsonComments(text.replace(/(?<!"[^":{]*){{[^}]*}}(?![^"},]*")/g, '1')));
      } catch (error) {
        const { message, location } = error;
        const line = location?.start?.line;
        const column = location?.start?.column;
        if (line && column) {
          found.push({
            from: CodeMirror.Pos(line - 1, column),
            to: CodeMirror.Pos(line - 1, column),
            message
          });
        }
      }
      return found;
    });

    if (editor) {
      editor.setOption('lint', this.props.mode && editor.getValue().trim().length > 0 ? this.lintOptions : false);
      editor.on('change', this._onEdit);
      editor.scrollTo(null, this.props.initialScroll);
      this.addOverlay();

      const getAllVariablesHandler = () => getAllVariables(this.props.collection, this.props.item);

      // Setup AutoComplete Helper for all modes
      const autoCompleteOptions = {
        showHintsFor: this.props.showHintsFor,
        getAllVariables: getAllVariablesHandler
      };

      this.brunoAutoCompleteCleanup = setupAutoComplete(
        editor,
        autoCompleteOptions
      );

      setupLinkAware(editor);

      // Setup lint error tooltip on line number hover
      this.cleanupLintErrorTooltip = setupLintErrorTooltip(editor);

      // apply all preference-based hotkey maps
      this._applyAllHotkeyMaps();

      // keep updated if preferences change
      this._unsubscribeStore = store.subscribe(() => {
        this._applyAllHotkeyMaps();
      });
    }
  }

  componentDidUpdate(prevProps) {
    // Ensure the changes caused by this update are not interpreted as
    // user-input changes which could otherwise result in an infinite
    // event loop.
    this.ignoreChangeEvent = true;
    if (this.props.schema !== prevProps.schema && this.editor) {
      this.editor.options.lint.schema = this.props.schema;
      this.editor.options.hintOptions.schema = this.props.schema;
      this.editor.options.info.schema = this.props.schema;
      this.editor.options.jump.schema = this.props.schema;
      CodeMirror.signal(this.editor, 'change', this.editor);
    }
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      // TODO: temporary fix for keeping cursor state when auto save and new line insertion collide PR#7098
      const nextValue = this.props.value ?? '';
      const currentValue = this.editor.getValue();
      // Skip updating only when focused and editable; read-only editors (e.g. response viewer) must always show new value
      if (this.editor.hasFocus?.() && currentValue !== nextValue && !this.props.readOnly) {
        this.cachedValue = currentValue;
      } else {
        const cursor = this.editor.getCursor();
        this.cachedValue = nextValue;
        this.editor.setValue(nextValue);
        this.editor.setCursor(cursor);
      }
    }

    if (this.editor) {
      let variables = getAllVariables(this.props.collection, this.props.item);
      if (!isEqual(variables, this.variables)) {
        this.addOverlay();
      }

      // Update collection and item when they change
      if (this.props.enableBrunoVarInfo !== false && this.editor.options.brunoVarInfo) {
        if (!isEqual(this.props.collection, this.editor.options.brunoVarInfo.collection)) {
          this.editor.options.brunoVarInfo.collection = this.props.collection;
        }
        if (!isEqual(this.props.item, this.editor.options.brunoVarInfo.item)) {
          this.editor.options.brunoVarInfo.item = this.props.item;
        }
      }
    }

    if (this.props.theme !== prevProps.theme && this.editor) {
      this.editor.setOption('theme', this.props.theme === 'dark' ? 'monokai' : 'default');
    }

    if (this.props.initialScroll !== prevProps.initialScroll) {
      this.editor.scrollTo(null, this.props.initialScroll);
    }

    if (this.props.enableLineWrapping !== prevProps.enableLineWrapping) {
      this.editor.setOption('lineWrapping', this.props.enableLineWrapping);
    }

    if (this.props.mode !== prevProps.mode) {
      this.editor.setOption('mode', this.props.mode);
    }

    if (this.props.readOnly !== prevProps.readOnly && this.editor) {
      this.editor.setOption('readOnly', this.props.readOnly);
    }

    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    if (this._unsubscribeStore) {
      this._unsubscribeStore();
      this._unsubscribeStore = null;
    }

    if (this.editor) {
      if (this.props.onScroll) {
        this.props.onScroll(this.editor);
      }

      this.editor?._destroyLinkAware?.();
      this.editor.off('change', this._onEdit);

      // Clean up lint error tooltip
      this.cleanupLintErrorTooltip?.();

      // remove our hotkey maps
      const maps = [
        this._closeTabKeyMap,
        this._sendRequestKeyMap,
        this._prevTabKeyMap,
        this._nextTabKeyMap,
        this._moveLeftTabKeyMap,
        this._moveRightTabKeyMap,
        this._changeLayoutKeyMap,
        this._collapseSidebarKeyMap
      ];

      maps.forEach((m) => {
        if (!m) return;
        try {
          this.editor.removeKeyMap(m);
        } catch (e) {}
      });

      this._closeTabKeyMap = null;
      this._sendRequestKeyMap = null;
      this._prevTabKeyMap = null;
      this._nextTabKeyMap = null;
      this._moveLeftTabKeyMap = null;
      this._moveRightTabKeyMap = null;
      this._changeLayoutKeyMap = null;
      this._collapseSidebarKeyMap = null;

      const wrapper = this.editor.getWrapperElement();
      wrapper?.parentNode?.removeChild(wrapper);

      this.editor = null;
    }
  }

  render() {
    if (this.editor) {
      this.editor.refresh();
    }
    return (
      <StyledWrapper
        className={`h-full w-full flex flex-col relative graphiql-container ${this.props.readOnly ? 'read-only' : ''}`}
        aria-label="Code Editor"
        font={this.props.font}
        fontSize={this.props.fontSize}
      >
        <CodeMirrorSearch
          ref={(node) => {
            if (!node) return;
            this.searchBarRef.current = node;
          }}
          visible={this.state.searchBarVisible}
          editor={this.editor}
          onClose={() => this.setState({ searchBarVisible: false })}
        />
        <div
          className={`editor-container${this.state.searchBarVisible ? ' search-bar-visible' : ''}`}
          ref={(node) => { this._node = node; }}
          style={{ height: '100%', width: '100%' }}
        />
      </StyledWrapper>
    );
  }

  addOverlay = () => {
    const mode = this.props.mode || 'application/ld+json';
    let variables = getAllVariables(this.props.collection, this.props.item);
    this.variables = variables;

    // Update brunoVarInfo with latest variables
    if (this.props.enableBrunoVarInfo !== false && this.editor.options.brunoVarInfo) {
      this.editor.options.brunoVarInfo.variables = variables;
    }

    defineCodeMirrorBrunoVariablesMode(variables, mode, false, this.props.enableVariableHighlighting);
    this.editor.setOption('mode', 'brunovariables');
  };

  _onEdit = () => {
    if (!this.ignoreChangeEvent && this.editor) {
      this.editor.setOption('lint', this.editor.getValue().trim().length > 0 ? this.lintOptions : false);
      this.cachedValue = this.editor.getValue();
      if (this.props.onEdit) {
        this.props.onEdit(this.cachedValue);
      }
    }
  };
}
