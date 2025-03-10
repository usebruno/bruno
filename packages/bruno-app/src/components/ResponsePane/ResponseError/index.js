import React from 'react';
import { IconAlertCircle, IconX } from '@tabler/icons';

const ResponseError = ({ errorMessage, onClose }) => {
  if (!errorMessage) return null;

  return (
    <div className="script-error mt-4 mb-2">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="error-icon-container flex-shrink-0">
          <IconAlertCircle size={14} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="error-title">
            Script Execution Error
          </div>
          <div className="error-message">
            {errorMessage}
          </div>
        </div>
        <div 
          className="close-button flex-shrink-0 cursor-pointer"
          onClick={onClose}
        >
          <IconX size={16} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
};

export default ResponseError; 