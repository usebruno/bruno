import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import StyledWrapper from './StyledWrapper';

const SensitiveFieldWarning = ({ showWarning, fieldName, message }) => {
  if (!showWarning) return null;

  const tooltipId = `sensitive-field-warning-${fieldName}`;
  const defaultMessage =
    'Environment variable used in this sensitive field is not marked as a secret. Mark it as secret in the environment for better security.';

  return (
    <StyledWrapper>
      <span className="ml-2 flex items-center">
        <IconAlertTriangle id={tooltipId} className="text-amber-600 cursor-pointer" size={20} />
        <Tooltip
          anchorId={tooltipId}
          className="tooltip-mod max-w-lg"
          content={
            <div>
              <p>
                <span>{message || defaultMessage}</span>
              </p>
            </div>
          }
        />
      </span>
    </StyledWrapper>
  );
};

export default SensitiveFieldWarning;
