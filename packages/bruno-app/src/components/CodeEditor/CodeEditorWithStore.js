import React from 'react';
import CodeEditor from './index';
import { useStore } from 'react-redux';

/**
 * CodeEditorWithStore - A wrapper component that provides Redux store access to CodeEditor
 * This ensures that CodeMirror extensions like brunoVarInfo can safely access Redux
 * without relying on global store exposure.
 */
const CodeEditorWithStore = (props) => {
  const store = useStore();
  
  return <CodeEditor {...props} store={store} />;
};

export default CodeEditorWithStore;
