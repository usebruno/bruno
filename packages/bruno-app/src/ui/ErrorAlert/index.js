import React from 'react';
import { IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const ErrorAlert = ({ title, message, onClose }) => {
  if (!message) return null;

  return (
    <StyledWrapper className="mt-4 mb-2">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          {title && <div className="error-title">{title}</div>}
          <div className="error-message">{typeof message === 'string' ? message : JSON.stringify(message, null, 2)}</div>
        </div>
        {onClose && (
          <div className="close-button flex-shrink-0 cursor-pointer" onClick={onClose}>
            <IconX size={16} strokeWidth={1.5} />
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default ErrorAlert;
