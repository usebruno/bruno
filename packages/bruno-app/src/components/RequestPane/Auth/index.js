import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const RequestBody = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const onEdit = (value) => {
    // dispatch(
    //   updateRequestBody({
    //     content: value,
    //     itemUid: item.uid,
    //     collectionUid: collection.uid
    //   })
    // );
  };

  if (authMode === 'basic') {
    return <div>Basic Auth</div>;
  }

  if (authMode === 'bearer') {
    return <div>Bearer Token</div>;
  }

  return <StyledWrapper className="w-full">No Auth</StyledWrapper>;
};
export default RequestBody;
