import React from 'react';
import { IconEraser } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { responseReceived } from 'providers/ReduxStore/slices/collections/index';

const ResponseClear = ({ collection, item }) => {
  const dispatch = useDispatch();
  const response = item.response || {};

  const clearResponse = () =>
    dispatch(
      responseReceived({
        itemUid: item.uid,
        collectionUid: collection.uid,
        response: null
      })
    );

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={clearResponse} disabled={!response.dataBuffer} title="Clear response">
        <IconEraser size={16} strokeWidth={1.5} />
      </button>
    </StyledWrapper>
  );
};
export default ResponseClear;
