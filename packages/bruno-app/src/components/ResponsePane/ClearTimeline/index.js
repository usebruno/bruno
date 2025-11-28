import React from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { clearRequestTimeline } from 'providers/ReduxStore/slices/collections/index';

const ClearTimeline = ({ collection, item }) => {
  const dispatch = useDispatch();

  const clearResponse = () =>
    dispatch(
      clearRequestTimeline({
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button onClick={clearResponse} className='text-link hover:underline' title="Clear Timeline">
        Clear Timeline
      </button>
    </StyledWrapper>
  );
};

export default ClearTimeline;
