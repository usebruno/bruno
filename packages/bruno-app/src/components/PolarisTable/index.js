import React from 'react';
import StyledWrapper from './StyledWrapper';

/**
 * PolarisTable - A common wrapper component for Polaris-inspired table styling
 *
 * This component provides consistent table styling across the application
 * with Polaris design guidelines including:
 * - Rounded borders
 * - Proper spacing and typography
 * - Hover states
 * - Checkbox styling
 * - Input field styling
 * - Action button styling
 *
 * Usage:
 * <PolarisTable>
 *   {children}
 * </PolarisTable>
 */
const PolarisTable = ({ children, className = '' }) => {
  return (
    <StyledWrapper className={className}>
      {children}
    </StyledWrapper>
  );
};

export default PolarisTable;
