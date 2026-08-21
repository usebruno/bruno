import React from 'react';
import StyledWrapper from './StyledWrapper';

/**
 * CountBadge — small pill-shaped badge for displaying counts.
 *
 * Props:
 * - children:   the count or label to display
 * - variant:    visual style — 'default' | 'danger' | 'warning' (default: 'default')
 * - size:       size preset — 'sm' | 'md' (default: 'sm')
 * - className:  passthrough for additional styling
 *
 * @example
 * <CountBadge>{totalEnvironments}</CountBadge>
 * <CountBadge variant="danger" size="md">{errorCount}</CountBadge>
 * <CountBadge variant="warning">{warningCount}</CountBadge>
 */
const CountBadge = ({ children, variant = 'default', size = 'sm', className = '', ...rest }) => {
  return (
    <StyledWrapper $variant={variant} $size={size} className={className} {...rest}>
      {children}
    </StyledWrapper>
  );
};

export default CountBadge;
