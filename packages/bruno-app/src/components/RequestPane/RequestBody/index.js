import React, { useRef } from 'react';
import get from 'lodash/get';
import CodeEditor from 'components/CodeEditor';
import FormUrlEncodedParams from 'components/RequestPane/FormUrlEncodedParams';
import MultipartFormParams from 'components/RequestPane/MultipartFormParams';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import FileBody from '../FileBody/index';
import { usePersistedState } from 'hooks/usePersistedState';
import useOpenApiBodySchema from 'hooks/useOpenApiBodySchema';

const RequestBody = ({ item, collection }) => {
  const dispatch = useDispatch();
  const editorRef = useRef(null);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const bodyMode = item.draft ? get(item, 'draft.request.body.mode') : get(item, 'request.body.mode');
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [bodyScroll, setBodyScroll] = usePersistedState({ key: `request-body-${bodyMode}-scroll-${item.uid}`, default: 0 });
  const openApi = useOpenApiBodySchema({ item, collection, enabled: bodyMode === 'json' });

  const onEdit = (value) => {
    dispatch(
      updateRequestBody({
        content: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  if (['json', 'xml', 'text', 'sparql'].includes(bodyMode)) {
    let codeMirrorMode = {
      json: 'application/ld+json',
      text: 'application/text',
      xml: 'application/xml',
      sparql: 'application/sparql-query'
    };

    let bodyContent = {
      json: body.json,
      text: body.text,
      xml: body.xml,
      sparql: body.sparql
    };

    return (
      <StyledWrapper className="w-full h-full flex flex-col" data-testid="request-body-editor">
        {openApi.contract?.type === 'openapi' && (
          <div
            className={`openapi-contract-status text-xs px-2 py-1 ${openApi.status === 'error' ? 'text-danger' : 'text-muted'}`}
            title={openApi.error || undefined}
            data-testid="openapi-body-contract-status"
          >
            {openApi.status === 'loading' && 'OpenAPI: loading schema…'}
            {openApi.status === 'ready' && `OpenAPI: ${openApi.operationId || item.name} · ${openApi.contentType}`}
            {openApi.status === 'error' && `OpenAPI: ${openApi.error}`}
          </div>
        )}
        <CodeEditor
          ref={editorRef}
          collection={collection}
          item={item}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          value={bodyContent[bodyMode] || ''}
          onEdit={onEdit}
          onRun={onRun}
          onSave={onSave}
          initialScroll={bodyScroll}
          onScroll={setBodyScroll}
          mode={codeMirrorMode[bodyMode]}
          enableVariableHighlighting={true}
          showHintsFor={['variables']}
          schema={openApi.schema}
        />
      </StyledWrapper>
    );
  }

  if (bodyMode === 'file') {
    return <FileBody item={item} collection={collection} />;
  }

  if (bodyMode === 'formUrlEncoded') {
    return <FormUrlEncodedParams item={item} collection={collection} />;
  }

  if (bodyMode === 'multipartForm') {
    return <MultipartFormParams item={item} collection={collection} />;
  }

  return <StyledWrapper className="w-full">No Body</StyledWrapper>;
};
export default RequestBody;
