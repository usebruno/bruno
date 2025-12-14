import React from 'react';
import StyledWrapper from './StyledWrapper';

/**
 * ActionIcon - A reusable icon button component
 *
 * @param {Object} props
 * @param {ReactNode} props.children - The icon component to render
 * @param {string} props.variant - Visual variant: 'subtle' (default), 'filled', 'outline', etc.
 * @param {string} props.size - Size of the button: 'sm', 'md', 'lg', etc. (default: 'md')
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.className - Additional CSS class names
 * @param {string} props.component - Polymorphic component (default: 'button')
 * @param {string} props.label - Label for both title and aria-label (preferred)
 * @param {string} props.title - Title attribute (falls back to label or aria-label)
 * @param {string} [props.ariaLabel] - Accessibility label (falls back to label or title)
 * @param {string} props.colorOnHover - Color to apply to icon on hover/focus (e.g., 'red', '#ef4444', 'var(--color-danger)')
 * @param {string} props.color - Color to override the default variant color (e.g., 'red', '#ef4444', 'var(--color-text)')
 * @param {string} props.style - Style to override the default variant style (e.g., 'width: 16px; min-width: 16px;')
 * @param {Object} props...rest - Other props passed to the underlying element
 */
const ActionIcon = ({
  children,
  variant = 'subtle',
  size = 'md',
  disabled = false,
  className = '',
  component: Component = 'button',
  label,
  'aria-label': ariaLabel,
  colorOnHover,
  color,
  style,
  ...rest
}) => {
  // Build className array and filter out empty strings
  const classNames = ['action-icon', className].filter(Boolean).join(' ');

  return (
    <StyledWrapper
      as={Component}
      $variant={variant}
      $size={size}
      $colorOnHover={colorOnHover}
      $color={color}
      disabled={disabled}
      className={classNames}
      title={label}
      aria-label={ariaLabel}
      style={style}
      {...rest}
    >
      {children}
    </StyledWrapper>
  );
};

export default ActionIcon;
