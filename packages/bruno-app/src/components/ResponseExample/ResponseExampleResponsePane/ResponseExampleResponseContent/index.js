import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import get from 'lodash/get';
import { updateResponseExampleResponse } from 'providers/ReduxStore/slices/collections';
import CodeEditor from 'components/CodeEditor';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import { detectContentTypeFromBase64, getBinaryPreviewType } from 'utils/response';
import StyledWrapper from './StyledWrapper';
import QueryResult from 'components/ResponsePane/QueryResult';

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

  const isBinaryBody = response?.body?.type === 'binary';
  const sniffedMime = useMemo(
    () => (isBinaryBody ? detectContentTypeFromBase64(response.body?.content) : null),
    [isBinaryBody, response.body?.content]
  );
  const binaryPreviewType = getBinaryPreviewType(sniffedMime);

  if (binaryPreviewType) {
    return (
      <StyledWrapper className="w-full px-4" data-testid="response-example-binary-preview" data-preview-type={binaryPreviewType}>
        <QueryResult
          item={item}
          collection={collection}
          data={response.body.content}
          dataBuffer={response.body.content}
          headers={response.headers}
          error={response.error}
          selectedFormat="base64"
          selectedTab="preview"
          disableRunEventListener
          docKey={`response-example-response-content:${exampleUid}`}
        />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="w-full px-4">
      <div className="code-editor-container" data-testid="response-example-response-content">
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
