import React from 'react';
import { IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const WarningBanner = ({ warnings, onClose, className = '' }) => {
  if (!warnings || warnings.length === 0) return null;

  return (
    <StyledWrapper className={className}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          {warnings.map((warning, index) => (
            <div key={index}>
              {index > 0 && <div className="separator my-2"></div>}
              <div className="warning-title">
                {warning.title}
              </div>
              <div className="warning-message">
                {warning.message}
              </div>
            </div>
          ))}
        </div>
        {onClose && (
          <div
            className="close-button flex-shrink-0 cursor-pointer"
            onClick={onClose}
          >
            <IconX size={16} strokeWidth={1.5} />
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default WarningBanner;
