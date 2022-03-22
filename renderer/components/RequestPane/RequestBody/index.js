import React from 'react';
import get from 'lodash/get';
import CodeEditor from 'components/CodeEditor';
import { useDispatch } from 'react-redux';
import { updateRequestBody, sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const RequestBody = ({item, collection}) => {
  const dispatch = useDispatch();
  const bodyContent = item.draft ? get(item, 'draft.request.body.content') : get(item, 'request.body.content');

  const onEdit = (value) => {
    dispatch(updateRequestBody({
      mode: 'json',
      content: value,
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));;
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));;

  return(
    <StyledWrapper className="w-full">
      <CodeEditor value={bodyContent || ''} onEdit={onEdit} onRun={onRun} onSave={onSave}/>
    </StyledWrapper>
  );
};
export default RequestBody;
