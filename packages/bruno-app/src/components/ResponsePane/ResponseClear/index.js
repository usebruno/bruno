import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { IconEraser } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { responseCleared } from 'providers/ReduxStore/slices/collections/index';
import ActionIcon from 'ui/ActionIcon/index';

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

const ResponseClear = forwardRef(({ collection, item, children }, ref) => {
  const { clearResponse } = useResponseClear(item, collection);
  const elementRef = useRef(null);

  useImperativeHandle(ref, () => ({
    click: () => elementRef.current?.click(),
    isDisabled: false
  }), []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      clearResponse();
    }
  };

  return (
    <div ref={elementRef} role={!!children ? 'button' : undefined} tabIndex={!!children ? 0 : -1} onClick={clearResponse} title={!children ? 'Clear response' : null} onKeyDown={handleKeyDown} data-testid="response-clear-btn">
      {children ? children : (
        <StyledWrapper className="flex items-center">
          <ActionIcon className="p-1">
            <IconEraser size={16} strokeWidth={2} />
          </ActionIcon>
        </StyledWrapper>
      )}
    </div>
  );
});

ResponseClear.displayName = 'ResponseClear';

export default ResponseClear;
