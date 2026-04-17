import React, { Suspense, forwardRef, lazy } from 'react';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import CodeEditor from 'components/CodeEditor';

const LazyMonacoEditor = lazy(() => import('components/MonacoEditor'));

const ScriptEditor = forwardRef((props, ref) => {
  const useMonaco = useBetaFeature(BETA_FEATURES.MONACO_EDITOR);

  if (!useMonaco) {
    return <CodeEditor ref={ref} {...props} />;
  }

  return (
    <Suspense fallback={null}>
      <LazyMonacoEditor ref={ref} {...props} />
    </Suspense>
  );
});

export default ScriptEditor;
