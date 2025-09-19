import React from 'react';
import StyledWrapper from './StyledWrapper';

const HeightBoundContainer = ({children}) => {
  return (
    <StyledWrapper>
      <div className="height-constraint">
        <div className="flex-boundary">
          {children}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default HeightBoundContainer;
