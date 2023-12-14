import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

const CodeEditor2 = ({ collection, font, mode, onRun, readOnly, theme, value }) => {
  const [newValue, setNewValue] = useState(value || '');
  const onChange = React.useCallback((val, viewUpdate) => {
    console.log('val:', val);
    setNewValue(val);
  }, []);
  return <CodeMirror value={newValue} height="200px" extensions={[javascript({ jsx: true })]} onChange={onChange} />;
};

export default CodeEditor2;
