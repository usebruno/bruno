import React from 'react';
import { IconEraser } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { responseCleared } from 'providers/ReduxStore/slices/collections/index';

// Hook to get clear response function
export const useResponseClear = (item, collection) => {
  const dispatch = useDispatch();

  const clearResponse = () => {
    dispatch(
      responseCleared({
        itemUid: item.uid,
        collectionUid: collection.uid,
        response: null
      })
    );
  };

  return { clearResponse };
};

const ResponseClear = ({ collection, item, children }) => {
  const { clearResponse } = useResponseClear(item, collection);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      clearResponse();
    }
  };

  return (
    <div role={!!children ? 'button' : undefined} tabIndex={0} onClick={clearResponse} title={!children ? 'Clear response' : null} onKeyDown={handleKeyDown} data-testid="response-clear-button">
      {children ? children : (
        <StyledWrapper className="flex items-center">
          <button className="p-1">
            <IconEraser size={16} strokeWidth={2} />
          </button>
        </StyledWrapper>
      )}
    </div>
  );
};
export default ResponseClear;
