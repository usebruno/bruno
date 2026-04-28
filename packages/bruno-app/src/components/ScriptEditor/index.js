import React, { Suspense, forwardRef, lazy } from 'react';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import CodeEditor from 'components/CodeEditor';

const LazyMonacoEditor = lazy(() => import('components/MonacoEditor'));

const EditorLoadingFallback = () => (
  <div style={{ padding: '8px 12px', opacity: 0.5, fontSize: '13px' }}>
    Loading editor...
  </div>
);

const ScriptEditor = forwardRef((props, ref) => {
  const useMonaco = useBetaFeature(BETA_FEATURES.MONACO_EDITOR);

  if (!useMonaco) {
    return <CodeEditor ref={ref} {...props} />;
  }

  return (
    <Suspense fallback={<EditorLoadingFallback />}>
      <LazyMonacoEditor ref={ref} {...props} />
    </Suspense>
  );
});

ScriptEditor.displayName = 'ScriptEditor';

export default ScriptEditor;
