import React from 'react';
import IconAlertTriangleFilled from '../Icons/IconAlertTriangleFilled';
import StyledWrapper from './StyledWrapper';

const DeprecationWarning = ({ message }) => {
  return (
    <StyledWrapper>
      <div className="deprecation-warning">
        <IconAlertTriangleFilled className="warning-icon" size={16} />
        <span className="warning-text">{message}</span>
      </div>
    </StyledWrapper>
  );
};

export default DeprecationWarning;
