import React, { useState, useRef, useEffect } from 'react';
import StyledWrapper from './StyledWrapper';

let CodeMirror;
const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
}

const QueryResult = ({data, width}) => {
  const [cmEditor, setCmEditor] = useState(null);
  const editor = useRef();

  useEffect(() => {
    if (editor.current && !cmEditor) {
      const _cmEditor = CodeMirror.fromTextArea(editor.current, {
        value: '',
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        mode: "application/ld+json",
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        lineWrapping: true
      });

      setCmEditor(_cmEditor);
    }

    if(editor.current && cmEditor && data) {
      cmEditor.setValue(JSON.stringify(data, null, 2));
    }

    return () => {
      if(cmEditor) {
        cmEditor.toTextArea();
        setCmEditor(null);
      }
    }
  }, [editor.current, cmEditor, data]);

  return (
    <StyledWrapper className="mt-4 px-3 w-full" style={{maxWidth: width}}>
      <div className="h-full">
        <textarea
          id="query-result"
          ref={editor}
          className="cm-editor"
        >
        </textarea>
      </div>
    </StyledWrapper>
  );
};

export default QueryResult;
