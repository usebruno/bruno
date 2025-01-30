import React from 'react';
import StyledWrapper from './StyledWrapper';
import { debounce, escapeRegExp } from 'lodash';
import toast from 'react-hot-toast';
let CodeMirror = require('codemirror');

async function bruLinter(text, callback, type) {
  try {
    const errors = await ipcRenderer.invoke('renderer:bru-grammar-check', { text, type });
    const annotations = errors?.map(error => ({
      message: error?.message,
      severity: 'error',
      from: CodeMirror.Pos(error?.errorLine - 1, error?.errorColumn),
      to: CodeMirror.Pos(error?.errorLine - 1, error?.errorColumn + 1),
    }));
    callback(annotations || []);
  } catch (err) {
    console.error("Error in linter:", err);
    callback([]);
  }
}

export default class CodeEditor extends React.Component {
  constructor(props) {
    super(props);
    this.cachedValue = props.value || '';
    this.variables = {};
    this.searchResultsCountElementId = 'search-results-count';
    this.state = {
      hasLintErrors: false,
    };
    this.debouncedLint = debounce(this._checkLintErrors, 500);
    this.lintOptions = {
      getAnnotations: (text, callback) => bruLinter(text, callback, this.props.type || 'request'),
      async: true,
    };
  }

  componentDidMount() {
    const editor = (this.editor = CodeMirror(this._node, {
      value: this.props.value || '',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      mode: 'application/ld+json',
      keyMap: 'sublime',
      autoCloseBrackets: true,
      matchBrackets: true,
      showCursorWhenSelecting: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
      lint: this.lintOptions,
      readOnly: this.props.readOnly,
      scrollbarStyle: 'overlay',
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      extraKeys: {
        'Cmd-S': () => this.handleSave(),
        'Ctrl-S': () => this.handleSave(),
        'Shift-Cmd-M': () => this.props.toggleFileMode && this.props.toggleFileMode(),
        'Shift-Ctrl-M': () => this.props.toggleFileMode && this.props.toggleFileMode(),
        'Cmd-F': (cm) => {
          cm.execCommand('findPersistent');
          this._bindSearchHandler();
          this._appendSearchResultsCount();
        },
        'Ctrl-F': (cm) => {
          cm.execCommand('findPersistent');
          this._bindSearchHandler();
          this._appendSearchResultsCount();
        },
        'Cmd-H': 'replace',
        'Ctrl-H': 'replace',
        Tab: cm => {
          cm.getSelection().includes('\n') || editor.getLine(cm.getCursor().line) == cm.getSelection()
            ? cm.execCommand('indentMore')
            : cm.replaceSelection('  ', 'end');
        },
        'Shift-Tab': 'indentLess',
        'Ctrl-Space': 'autocomplete',
        'Cmd-Space': 'autocomplete',
        'Ctrl-Y': 'foldAll',
        'Cmd-Y': 'foldAll',
        'Ctrl-I': 'unfoldAll',
        'Cmd-I': 'unfoldAll',
      },
    }));

    if (editor) {
      editor.on('change', this._onEdit);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      this.cachedValue = this.props.value;
      this.editor.setValue(this.props.value);
    }
    if (this.props.theme !== prevProps.theme && this.editor) {
      this.editor.setOption('theme', this.props.theme === 'dark' ? 'monokai' : 'default');
    }
  }

  componentWillUnmount() {
    if (this.editor) {
      this.editor.off('change', this._onEdit);
      this.editor = null;
    }
  }

  render() {
    if (this.editor) {
      this.editor.refresh();
    }
    return (
      <StyledWrapper
        className="h-full w-full graphiql-container"
        aria-label="Code Editor"
        font={this.props.font}
        fontSize={this.props.fontSize}
        ref={(node) => {
          this._node = node;
        }}
      />
    );
  }

  _checkLintErrors = async () => {
    if (this.editor) {
      const editorText = this.editor.getValue().trim();
      await this.lintOptions.getAnnotations(editorText, (errors) => {
        const hasLintErrors = errors.length > 0;
        this.setState({ hasLintErrors });
      });
    }
  };

  _onEdit = () => {
    if (this.editor) {
      this.cachedValue = this.editor.getValue();
      this.debouncedLint(); // Call the debounced linting function
      if (this.props.onEdit) {
        this.props.onEdit(this.cachedValue);
      }
    }
  };

  // Handle the save action, only allowing it if no lint errors exist
  handleSave = () => {
    if (!this.state.hasLintErrors && this.props.onSave) {
      this.props.onSave();
    } else {
      toast.error('invalid bru syntax');
    }
  };

    /**
     * Bind handler to search input to count number of search results
     */
    _bindSearchHandler = () => {
      const searchInput = document.querySelector('.CodeMirror-search-field');
  
      if (searchInput) {
        searchInput.addEventListener('input', this._countSearchResults);
      }
    };
  
    /**
     * Unbind handler to search input to count number of search results
     */
    _unbindSearchHandler = () => {
      const searchInput = document.querySelector('.CodeMirror-search-field');
  
      if (searchInput) {
        searchInput.removeEventListener('input', this._countSearchResults);
      }
    };
  
    /**
     * Append search results count to search dialog
     */
    _appendSearchResultsCount = () => {
      const dialog = document.querySelector('.CodeMirror-dialog.CodeMirror-dialog-top');
  
      if (dialog) {
        const searchResultsCount = document.createElement('span');
        searchResultsCount.id = this.searchResultsCountElementId;
        dialog.appendChild(searchResultsCount);
  
        this._countSearchResults();
      }
    };
  
    /**
     * Count search results and update state
     */
    _countSearchResults = () => {
      let count = 0;
  
      const searchInput = document.querySelector('.CodeMirror-search-field');
  
      if (searchInput && searchInput.value.length > 0) {
        // Escape special characters in search input to prevent RegExp crashes. Fixes #3051
        const text = new RegExp(escapeRegExp(searchInput.value), 'gi');
        const matches = this.editor.getValue().match(text);
        count = matches ? matches.length : 0;
      }
  
      const searchResultsCountElement = document.querySelector(`#${this.searchResultsCountElementId}`);
  
      if (searchResultsCountElement) {
        searchResultsCountElement.innerText = `${count} results`;
      }
    };
}
