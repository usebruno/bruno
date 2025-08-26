import React from 'react';
import { IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const WSError = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <StyledWrapper className="mt-4 mb-2">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="error-title">WebSocket Server Error</div>
          <div className="error-message">{typeof error === 'string' ? error : JSON.stringify(error, null, 2)}</div>
        </div>
        <div className="close-button flex-shrink-0 cursor-pointer" onClick={onClose}>
          <IconX size={16} strokeWidth={1.5} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WSError;
