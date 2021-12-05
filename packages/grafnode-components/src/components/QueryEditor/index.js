import React, { useState, useEffect, useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import * as CodeMirror from 'codemirror';

const QueryEditor = ({query, onChange, width}) => {
  const [cmEditor, setCmEditor] = useState(null);
  const editor = useRef();

  useEffect(() => {
    if (editor.current && !cmEditor) {
      const _cmEditor = CodeMirror.fromTextArea(editor.current, {
        value: '',
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        mode: "graphql",
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        lineWrapping: true
      });

      _cmEditor.setValue(query || 'query { }');

      setCmEditor(_cmEditor);
    }

    return () => {
      if(cmEditor) {
        cmEditor.toTextArea();
      }
    }
  }, [editor.current, cmEditor]);

  return (
    <StyledWrapper>
      <div className="mt-4">
        <textarea
          id="operation"
          style={{
            width: `${width}px`,
            height: '400px'
          }}
          ref={editor}
          className="cm-editor"
        >
        </textarea>
      </div>
    </StyledWrapper>
  );
};

export default QueryEditor;