import React from 'react';
import get from 'lodash/get';
import CodeEditor from 'components/CodeEditor';
import { useDispatch } from 'react-redux';
import { updateRequestBody, sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const RequestBody = ({item, collection}) => {
  const dispatch = useDispatch();
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const bodyMode = item.draft ? get(item, 'draft.request.body.mode') : get(item, 'request.body.mode');

  const onEdit = (value) => {
    dispatch(updateRequestBody({
      content: value,
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));;
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  if(['json', 'xml', 'text'].includes(bodyMode)) {
    let codeMirrorMode = {
      json: 'application/ld+json',
      text: 'application/text',
      xml: 'application/xml'
    };

    let bodyContent = {
      json: body.json,
      text: body.text,
      xml: body.xml
    };

    return(
      <StyledWrapper className="w-full">
        <CodeEditor
          value={bodyContent[bodyMode] || ''}
          onEdit={onEdit}
          onRun={onRun}
          onSave={onSave}
          mode={codeMirrorMode[bodyMode]}
        />
      </StyledWrapper>
    );
  }

  return(
    <StyledWrapper className="w-full">
      No Body
    </StyledWrapper>
  );
};
export default RequestBody;
