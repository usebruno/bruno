import React from 'react';
import get from 'lodash/get';
import CodeEditor from 'components/CodeEditor';
import { useDispatch } from 'react-redux';
import { requestChanged } from 'providers/ReduxStore/slices/tabs';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import RequestBodyMode from './RequestBodyMode';
import StyledWrapper from './StyledWrapper';

const RequestBody = ({item, collection}) => {
  const dispatch = useDispatch();
  const bodyContent = item.draft ? get(item, 'draft.request.body.content') : get(item, 'request.body.content');

  const onEdit = (value) => {
    dispatch(requestChanged({
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
    dispatch(updateRequestBody({
      mode: 'json',
      content: value,
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  return(
    <StyledWrapper className="mt-3">
      <RequestBodyMode />
      <div className="mt-4">
        <CodeEditor value={bodyContent || ''} onEdit={onEdit}/>
      </div>
    </StyledWrapper>
  );
};
export default RequestBody;
