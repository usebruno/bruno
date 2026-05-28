import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import StyledWrapper from './StyledWrapper';

const SensitiveFieldWarning = ({ fieldName, warningMessage }) => {
  const tooltipId = `sensitive-field-warning-${fieldName}`;

  return (
    <StyledWrapper>
      <span className="ml-2 flex items-center">
        <IconAlertTriangle id={tooltipId} className="tooltip-icon cursor-pointer" size={20} />
        <Tooltip
          anchorId={tooltipId}
          className="tooltip-mod max-w-lg"
          content={(
            <div>
              <p>
                <span>{warningMessage}</span>
              </p>
            </div>
          )}
        />
      </span>
    </StyledWrapper>
  );
};

export default SensitiveFieldWarning;
