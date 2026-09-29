import React from 'react';
import StyledWrapper from './StyledWrapper';

const HeightBoundContainer = ({ children, className }) => {
  return (
    <StyledWrapper className={className}>
      <div className="height-constraint">
        <div className="flex-boundary" data-testid="flex-boundary">
          {children}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default HeightBoundContainer;
