import React from 'react';
import StyledWrapper from './StyledWrapper';

const ScopePill = ({ label, color }) => (
  <StyledWrapper
    className="scope-pill"
    style={color ? { color, borderColor: color } : undefined}
    title={label}
    data-testid="variables-scope-pill"
  >
    {label}
  </StyledWrapper>
);

export default ScopePill;
