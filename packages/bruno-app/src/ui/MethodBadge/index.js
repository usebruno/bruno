import React from 'react';
import StyledWrapper from './StyledWrapper';

const MethodBadge = ({ method, size = 'md', className = '' }) => {
  const normalizedMethod = method?.toLowerCase() || 'get';
  const displayText = method?.toUpperCase() || 'GET';

  return (
    <StyledWrapper
      $method={normalizedMethod}
      $size={size}
      className={className}
    >
      {displayText}
    </StyledWrapper>
  );
};

export default MethodBadge;
