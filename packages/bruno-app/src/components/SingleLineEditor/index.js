import React, { Component } from 'react';
import CodeMirror from 'codemirror';
import each from 'lodash/each';
import isEqual from 'lodash/isEqual';
import { findEnvironmentInCollection } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

class SingleLineEditor extends Component {
  constructor(props) {
    super(props);
    this.editorRef = React.createRef();
    this.variables = {};
  }
  componentDidMount() {
    // Initialize CodeMirror as a single line editor
    this.editor = CodeMirror(this.editorRef.current, {
      lineWrapping: false,
      lineNumbers: false,
      autofocus: true,
      mode: "brunovariables",
      extraKeys: {
        "Enter": () => {},
        "Ctrl-Enter": () => {},
        "Cmd-Enter": () => {},
        "Alt-Enter": () => {},
        "Shift-Enter": () => {}
      },
    });
    this.editor.setValue(this.props.value)

    this.editor.on('change', (cm) => {
      this.props.onChange(cm.getValue());
    });
    this.addOverlay();
  }

  componentDidUpdate(prevProps) {
    let variables = this.getEnvironmentVariables();
    if (!isEqual(variables, this.variables)) {
      this.addOverlay();
    }
  }

  componentWillUnmount() {
    this.editor.getWrapperElement().remove();
  }

  getEnvironmentVariables = () => {
    let variables = {};
    const collection = this.props.collection;
    if (collection) {
      const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
      if (environment) {
        each(environment.variables, (variable) => {
          if(variable.name && variable.value && variable.enabled) {
            variables[variable.name] = variable.value;
          }
        });
      }
    }

    return variables;
  }

  addOverlay = () => {
    let variables = this.getEnvironmentVariables();
    this.variables = variables;
    
    CodeMirror.defineMode("brunovariables", function(config, parserConfig) {
      let variablesOverlay = {
        token: function(stream, state) {
          if (stream.match("{{", true)) {
            let ch;
            let word = "";
            while ((ch = stream.next()) != null) {
              if (ch == "}" && stream.next() == "}") {
                stream.eat("}");
                if (word in variables) {
                  return "variable-valid";
                } else {
                  return "variable-invalid";
                }
              }
              word += ch;
            }
          }
          while (stream.next() != null && !stream.match("{{", false)) {}
          return null;
        }
      };
      return CodeMirror.overlayMode(CodeMirror.getMode(config, parserConfig.backdrop || "text/plain"), variablesOverlay);
    });

    this.editor.setOption('mode', 'brunovariables');
  }

  render() {
    return (
      <StyledWrapper ref={this.editorRef} className="single-line-editor"></StyledWrapper>
    );
  }
}
export default SingleLineEditor;
