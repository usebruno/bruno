import React from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import CodeEditor from 'components/CodeEditor';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import StyledWrapper from 'components/ResponseExample/ResponseExampleResponsePane/ResponseExampleResponseContent/StyledWrapper';

const MockResponseTryResult = ({ collection, item, tryResult }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const contentType = tryResult?.headers?.['content-type'] || tryResult?.headers?.['Content-Type'] || '';

  return (
    <StyledWrapper className="w-full px-4">
      <div className="code-editor-container">
        <CodeEditor
          collection={collection}
          item={item}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          value={tryResult?.body || ''}
          onEdit={() => {}}
          onRun={() => {}}
          mode={getCodeMirrorModeBasedOnContentType(String(contentType).toLowerCase()) || 'application/ld+json'}
          enableVariableHighlighting={false}
          readOnly
        />
      </div>
    </StyledWrapper>
  );
};

export default MockResponseTryResult;
