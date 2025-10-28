import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import get from 'lodash/get';
import { updateResponseExampleResponse } from 'providers/ReduxStore/slices/collections';
import CodeEditor from 'components/CodeEditor';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import StyledWrapper from './StyledWrapper';

const ResponseExampleResponseContent = ({ editMode, item, collection, exampleUid, onSave }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const response = useMemo(() => {
    return item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.response || {} : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.response || {};
  }, [item, exampleUid]);

  const getResponseContent = () => {
    if (!response) {
      return '';
    }

    if (!response.body) {
      return '';
    }

    // if (response.body.type === 'binary') {
    //   // you'// receive base64 encoded string in response.body.content
    //   return Buffer.from(response.body.content, 'base64').toString('utf-8');
    // } else {
    //   return response.body.content;
    // }
    return response.body.content;
  };

  const getCodeMirrorMode = () => {
    if (!response) {
      return null;
    }

    if (response.body && response.body.type) {
      const bodyType = response.body.type;
      if (bodyType === 'json') {
        return 'application/ld+json';
      } else if (bodyType === 'xml') {
        return 'application/xml';
      } else if (bodyType === 'html') {
        return 'application/html';
      } else if (bodyType === 'text') {
        return 'application/text';
      }
    }

    const contentType = response.headers?.find((h) => h.name?.toLowerCase() === 'content-type')?.value?.toLowerCase() || '';

    return getCodeMirrorModeBasedOnContentType(contentType);
  };

  const onResponseEdit = (value) => {
    if (editMode && item && collection && exampleUid) {
      const currentBody = response.body || {};
      dispatch(updateResponseExampleResponse({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        response: {
          body: {
            type: currentBody.type || 'text',
            content: value
          }
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
