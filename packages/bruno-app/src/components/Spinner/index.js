import React from 'react';
import StyledWrapper from './StyledWrapper';

// Todo: Size, Color config support
const Spinner = ({ size, color, children }) => {
  return (
    <StyledWrapper>
      <div className="animate-spin"></div>
      {children && <div>{children}</div>}
    </StyledWrapper>
  );
};

export default Spinner;
