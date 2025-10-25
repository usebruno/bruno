import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import get from 'lodash/get';
import { updateResponseExampleResponse } from 'providers/ReduxStore/slices/collections';
import CodeEditor from 'components/CodeEditor';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import { safeStringifyJSON } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const ResponseExampleResponseContent = ({ editMode, item, collection, exampleUid, onSave }) => {
  const dispatch = useDispatch();
  const { theme, displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  // Get response from item draft, similar to how RequestHeaders works
  const response = item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.response || {} : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.response || {};

  const getResponseContent = () => {
    if (typeof response.body === 'string') {
      return response.body;
    }
    if (typeof response.body === 'object') {
      return safeStringifyJSON(response.body, true);
    }
    return '';
  };

  const getCodeMirrorMode = () => {
    // Try to detect content type from headers
    const contentType = response.headers?.find((h) => h.name?.toLowerCase() === 'content-type')?.value?.toLowerCase() || '';

    return getCodeMirrorModeBasedOnContentType(contentType);
  };

  const onResponseEdit = (value) => {
    if (editMode && item && collection && exampleUid) {
      dispatch(updateResponseExampleResponse({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        response: {
          body: value
        }
      }));
    }
  };

  return (
    <StyledWrapper className="w-full px-4">
      <div className="code-editor-container">
        <CodeEditor
          collection={collection}
          item={item}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          value={getResponseContent()}
          onEdit={onResponseEdit}
          onRun={() => {}}
          onSave={onSave}
          mode={getCodeMirrorMode()}
          enableVariableHighlighting={false}
          readOnly={!editMode}
        />
      </div>
    </StyledWrapper>
  );
};

export default ResponseExampleResponseContent;
