import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import StyledWrapper from './StyledWrapper';
import { usePreferences } from 'providers/Preferences/index';

let CodeMirror;
const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
  CodeMirror.registerHelper('hint', 'anyword', (editor, options) => {
    const word = /[\w$-]+/;
    const wordlist = (options && options.autocomplete) || [];
    let cur = editor.getCursor(),
      curLine = editor.getLine(cur.line);
    let end = cur.ch,
      start = end;
    while (start && word.test(curLine.charAt(start - 1))) --start;
    let curWord = start != end && curLine.slice(start, end);

    // Check if curWord is a valid string before proceeding
    if (typeof curWord !== 'string' || curWord.length < 3) {
      return null; // Abort the hint
    }

    const list = (options && options.list) || [];
    const re = new RegExp(word.source, 'g');
    for (let dir = -1; dir <= 1; dir += 2) {
      let line = cur.line,
        endLine = Math.min(Math.max(line + dir * 500, editor.firstLine()), editor.lastLine()) + dir;
      for (; line != endLine; line += dir) {
        let text = editor.getLine(line),
          m;
        while ((m = re.exec(text))) {
          if (line == cur.line && curWord.length < 3) continue;
          list.push(...wordlist.filter((el) => el.toLowerCase().startsWith(curWord.toLowerCase())));
        }
      }
    }
    return { list: [...new Set(list)], from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end) };
  });
  CodeMirror.commands.autocomplete = (cm, hint, options) => {
    cm.showHint({ hint, ...options });
  };
}

class SingleLineEditor extends Component {
  constructor(props) {
    super(props);
    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.editorRef = React.createRef();
    this.variables = {};
    this.autoSaveInterval = null;
  }
  componentDidMount() {
    // Initialize CodeMirror as a single line editor
    /** @type {import("codemirror").Editor} */
    this.editor = CodeMirror(this.editorRef.current, {
      lineWrapping: false,
      lineNumbers: false,
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      mode: 'brunovariables',
      brunoVarInfo: {
        variables: getAllVariables(this.props.collection)
      },
      scrollbarStyle: null,
      tabindex: 0,
      extraKeys: {
        Enter: () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Ctrl-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Cmd-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Alt-Enter': () => {
          if (this.props.allowNewlines) {
            this.editor.setValue(this.editor.getValue() + '\n');
            this.editor.setCursor({ line: this.editor.lineCount(), ch: 0 });
          } else if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Shift-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
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
        'Cmd-F': () => {},
        'Ctrl-F': () => {},
        // Tabbing disabled to make tabindex work
        Tab: false,
        'Shift-Tab': false
      }
    });
    if (this.props.autocomplete) {
      this.editor.on('keyup', (cm, event) => {
        if (!cm.state.completionActive /*Enables keyboard navigation in autocomplete list*/ && event.keyCode != 13) {
          /*Enter - do not open autocomplete list just after item has been selected in it*/
          CodeMirror.commands.autocomplete(cm, CodeMirror.hint.anyword, { autocomplete: this.props.autocomplete });
        }
      });
    }
    this.editor.setValue(String(this.props.value) || '');
    this.editor.on('change', this._onEdit);
    this.addOverlay();
    this.startAutosave();
  }

  _onEdit = () => {
    if (!this.ignoreChangeEvent && this.editor) {
      this.cachedValue = this.editor.getValue();
      if (this.props.onChange) {
        this.props.onChange(this.cachedValue);
      }
    }
  };

  startAutosave = () => {
    if (this.props.autoSave && this.props.onSave) {
      this.autoSaveInterval = setInterval(this.saveEditorContent, this.props.autoSaveInterval || 15000); // Default to 15 sec
    }
  };

  clearAutosave = () => {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  };

  saveEditorContent = () => {
    if (this.props.onSave) {
      const content = this.editor.getValue();
      console.log(content);
      this.props.onSave(content, 0);
    }
  };
  componentDidUpdate(prevProps) {
    // Ensure the changes caused by this update are not interpreted as
    // user-input changes which could otherwise result in an infinite
    // event loop.
    this.ignoreChangeEvent = true;

    let variables = getAllVariables(this.props.collection);
    if (!isEqual(variables, this.variables)) {
      this.editor.options.brunoVarInfo.variables = variables;
      this.addOverlay();
    }
    if (this.props.theme !== prevProps.theme && this.editor) {
      this.editor.setOption('theme', this.props.theme === 'dark' ? 'monokai' : 'default');
    }
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      this.cachedValue = String(this.props.value);
      this.editor.setValue(String(this.props.value) || '');
    }
    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    this.clearAutosave();
    this.editor.getWrapperElement().remove();
  }

  addOverlay = () => {
    let variables = getAllVariables(this.props.collection);
    this.variables = variables;

    defineCodeMirrorBrunoVariablesMode(variables, 'text/plain');
    this.editor.setOption('mode', 'brunovariables');
  };

  render() {
    return <StyledWrapper ref={this.editorRef} className="single-line-editor"></StyledWrapper>;
  }
}
export default SingleLineEditor;
