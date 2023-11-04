import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import StyledWrapper from './StyledWrapper';

let CodeMirror;
const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
}

class SingleLineDisplay extends Component {
  constructor(props) {
    super(props);
    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.editorRef = React.createRef();
    this.variables = {};
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
      readOnly: true
    });

    this.editor.setValue(this.props.value || '');
    this.addOverlay();
  }

  componentWillUnmount() {
    this.editor.getWrapperElement().remove();
  }

  addOverlay = () => {
    let variables = getAllVariables(this.props.collection);
    this.variables = variables;

    defineCodeMirrorBrunoVariablesMode(variables, 'text/plain');
    this.editor.setOption('mode', 'brunovariables');
  };

  render() {
    return <StyledWrapper ref={this.editorRef} className="single-line-display"></StyledWrapper>;
  }
}
export default SingleLineDisplay;
