import React from 'react';
import StyledWrapper from './StyledWrapper';

const WarningMessage = ({ fieldName, message, actionLabel, onAction }) => (
  <StyledWrapper role="tooltip" data-testid="sensitive-field-tooltip">
    <p>{message}</p>
    {actionLabel && (
      <button
        type="button"
        className="tooltip-action"
        data-testid={`sensitive-field-action-${fieldName}`}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    )}
  </StyledWrapper>
);

export default WarningMessage;
