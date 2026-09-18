import React from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { clearRequestTimelineAndReleasePins } from 'providers/ReduxStore/slices/collections/actions';

const ClearTimeline = ({ collection, item }) => {
  const dispatch = useDispatch();

  const clearResponse = () => dispatch(clearRequestTimelineAndReleasePins(item, collection));

  return (
    <StyledWrapper className="flex items-center">
      <button type="button" onClick={clearResponse} className="text-link hover:underline whitespace-nowrap" title="Clear Timeline">
        Clear Timeline
      </button>
    </StyledWrapper>
  );
};

export default ClearTimeline;
