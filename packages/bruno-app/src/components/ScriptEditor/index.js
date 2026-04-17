import React from 'react';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import CodeEditor from 'components/CodeEditor';
import MonacoEditor from 'components/MonacoEditor';

const ScriptEditor = (props) => {
  const useMonaco = useBetaFeature(BETA_FEATURES.MONACO_EDITOR);
  const Editor = useMonaco ? MonacoEditor : CodeEditor;
  return <Editor {...props} />;
};

export default ScriptEditor;
