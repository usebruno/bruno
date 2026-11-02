import React from 'react';
import StyledWrapper from './StyledWrapper';

/** Pill-shaped badge for counts. variant: 'default' | 'danger' | 'warning'. size: 'sm' | 'md'. */
const CountBadge = ({ children, variant = 'default', size = 'sm', className = '', ...rest }) => {
  return (
    <StyledWrapper $variant={variant} $size={size} className={className} {...rest}>
      {children}
    </StyledWrapper>
  );
};

CountBadge.displayName = 'CountBadge';

export default CountBadge;
