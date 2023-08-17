import React from 'react';
import StyledWrapper from './StyledWrapper';

const General = () => {
  return (
    <StyledWrapper>
      <div className="flex items-center mt-2">
        <input type="checkbox" checked={true} className="mr-3 mousetrap" />
        SSL Certificate Verification
      </div>
    </StyledWrapper>
  );
};

export default General;
