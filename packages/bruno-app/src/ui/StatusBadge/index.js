import React from 'react';
import StyledWrapper from './StyledWrapper';

/**
 * StatusBadge — reusable themed badge component.
 *
 * Props:
 * - children:     badge text content
 * - status:       theme status key — 'danger' | 'warning' | 'info' | 'success' | 'muted' (default: 'muted')
 * - variant:      visual style — 'light' | 'filled' | 'outline' | 'ghost' (default: 'light')
 * - size:         size preset — 'xs' | 'sm' | 'md' (default: 'sm')
 * - radius:       theme radius key ('sm','base','md','lg','xl') or CSS value (default: theme sm)
 * - leftSection:  ReactNode rendered before children (e.g. icon)
 * - rightSection: ReactNode rendered after children (e.g. Help tooltip)
 * - className:    passthrough for additional styling
 *
 * @example
 * <StatusBadge status="danger">Error</StatusBadge>
 * <StatusBadge status="info" variant="outline" radius="xl">v2.1</StatusBadge>
 * <StatusBadge status="warning" rightSection={<Help icon="info" size={11}>tooltip</Help>}>Conflict</StatusBadge>
 */
const StatusBadge = ({
  children,
  status = 'muted',
  variant = 'light',
  size = 'sm',
  radius,
  leftSection,
  rightSection,
  className = ''
}) => {
  return (
    <StyledWrapper
      $status={status}
      $variant={variant}
      $size={size}
      $radius={radius}
      className={className}
    >
      {leftSection}
      {children}
      {rightSection}
    </StyledWrapper>
  );
};

export default StatusBadge;
