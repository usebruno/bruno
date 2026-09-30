import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import StyledWrapper from './StyledWrapper';

const SensitiveFieldWarning = ({ fieldName, warningMessage }) => {
  const tooltipId = `sensitive-field-warning-${fieldName}`;

  return (
    <StyledWrapper>
      <span className="mr-[4px] flex items-center" data-testid={`sensitive-field-warning-${fieldName}`}>
        <IconAlertTriangle id={tooltipId} className="tooltip-icon cursor-pointer" size={16} />
        <Tooltip
          anchorId={tooltipId}
          className="tooltip-mod sensitive-field-tooltip"
          positionStrategy="fixed"
          place="left"
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
