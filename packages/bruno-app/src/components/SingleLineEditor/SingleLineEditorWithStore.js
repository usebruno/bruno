import React from 'react';
import SingleLineEditor from './index';
import { useStore } from 'react-redux';

/**
 * SingleLineEditorWithStore - A wrapper component that provides Redux store access to SingleLineEditor
 * This ensures that CodeMirror extensions like brunoVarInfo can safely access Redux
 * without relying on global store exposure.
 */
const SingleLineEditorWithStore = (props) => {
  const store = useStore();
  
  return <SingleLineEditor {...props} store={store} />;
};

export default SingleLineEditorWithStore;
