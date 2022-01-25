import React, { useState, useRef, useEffect } from 'react';
import { IconRefresh } from '@tabler/icons';
import StopWatch from '../../StopWatch';
import * as CodeMirror from 'codemirror';
import StyledWrapper from './StyledWrapper';

const QueryResult = ({data, isLoading, width}) => {
  const [cmEditor, setCmEditor] = useState(null);
  const editor = useRef();

  useEffect(() => {
    if (editor.current && !cmEditor) {
      const _cmEditor = CodeMirror.fromTextArea(editor.current, {
        value: '',
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        mode: "application/json",
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        lineWrapping: true
      });

      setCmEditor(_cmEditor);
    }

    if(editor.current && cmEditor && data && !isLoading) {
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
    <StyledWrapper className="mt-4 w-full">
      {isLoading && (
        <div className="overlay">
          <div style={{marginBottom: 15, fontSize: 26}}>
            <div style={{display: 'inline-block', fontSize: 24, marginLeft: 5, marginRight: 5}}>
              <StopWatch/>
            </div>
          </div>
          <IconRefresh size={24} className="animate-spin"/>
          <button
            className="mt-4 uppercase bg-gray-200 active:bg-blueGray-600 text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button"
          >
            Cancel Request
          </button>
        </div>
      )}
      <div className="h-full">
        <textarea
          id="operation"
          style={{
            width: `${width}px`,
          }}
          ref={editor}
          className="cm-editor"
        >
        </textarea>
      </div>
    </StyledWrapper>
  );
};

export default QueryResult;
