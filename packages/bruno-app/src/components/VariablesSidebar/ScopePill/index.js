import React from 'react';
import { getEnvBackgroundColor } from 'utils/environments';
import StyledWrapper from './StyledWrapper';

const ScopePill = ({ label, color }) => (
  <StyledWrapper
    className="scope-pill"
    style={color ? { color, backgroundColor: getEnvBackgroundColor(color) } : undefined}
    title={label}
    data-testid="variables-scope-pill"
  >
    {label}
  </StyledWrapper>
);

export default ScopePill;
