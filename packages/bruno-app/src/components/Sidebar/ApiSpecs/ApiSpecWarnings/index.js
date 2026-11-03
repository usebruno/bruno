import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const ApiSpecWarnings = ({ warnings }) => (
  <StyledWrapper>
    {warnings.map(({ testId, message }) => (
      <div key={testId} className="warning-banner flex items-start gap-2 mt-4 px-3 py-2" data-testid={testId}>
        <span className="warning-icon flex items-center flex-shrink-0">
          <IconAlertTriangle size={18} strokeWidth={1.5} />
        </span>
        <span>{message}</span>
      </div>
    ))}
  </StyledWrapper>
);

export default ApiSpecWarnings;
