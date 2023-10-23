import React from 'react';
import get from 'lodash/get';
import CodeEditor from 'components/CodeEditor';
import FormUrlEncodedParams from 'components/RequestPane/FormUrlEncodedParams';
import MultipartFormParams from 'components/RequestPane/MultipartFormParams';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import PaneContent from '../PaneContent/index';
import RequestBodyMode from './RequestBodyMode/index';

const RequestBody = ({ item, collection }) => {
  const dispatch = useDispatch();
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const bodyMode = item.draft ? get(item, 'draft.request.body.mode') : get(item, 'request.body.mode');
  const { storedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const selectBody = <RequestBodyMode item={item} collection={collection} />;

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
      <PaneContent codeMirrorFull head={selectBody}>
        <CodeEditor
          collection={collection}
          theme={storedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          value={bodyContent[bodyMode] || ''}
          onEdit={onEdit}
          onRun={onRun}
          onSave={onSave}
          mode={codeMirrorMode[bodyMode]}
        />
      </PaneContent>
    );
  }

  if (bodyMode === 'formUrlEncoded') {
    return (
      <PaneContent head={selectBody}>
        <FormUrlEncodedParams item={item} collection={collection} />
      </PaneContent>
    );
  }

  if (bodyMode === 'multipartForm') {
    return (
      <PaneContent head={selectBody}>
        <MultipartFormParams item={item} collection={collection} />
      </PaneContent>
    );
  }

  return (
    <PaneContent head={selectBody}>
      <div className="mt-2 text-center">No Body</div>
    </PaneContent>
  );
};
export default RequestBody;
