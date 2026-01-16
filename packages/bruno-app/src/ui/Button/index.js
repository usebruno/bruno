import React from 'react';
import StyledWrapper from './StyledWrapper';

const Button = ({
  children,
  size = 'base',
  variant = 'filled',
  color = 'primary',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  type = 'button',
  rounded = 'base',
  fontWeight,
  onClick,
  onDoubleClick,
  className = '',
  ...rest
}) => {
  const handleClick = (e) => {
    if (disabled || loading) return;
    onClick?.(e);
  };

  const handleDoubleClick = (e) => {
    if (disabled || loading) return;
    onDoubleClick?.(e);
  };

  return (
    <StyledWrapper
      $size={size}
      $variant={variant}
      $color={color}
      $disabled={disabled}
      $loading={loading}
      $fullWidth={fullWidth}
      $rounded={rounded}
      $fontWeight={fontWeight}
      $hasIcon={!!icon}
      $iconPosition={iconPosition}
      className={className}
    >
      <button
        type={type}
        disabled={disabled || loading}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        {...rest}
      >
        {loading && (
          <span className="button-spinner">
            <svg className="spinner-icon" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="31.4 31.4"
              />
            </svg>
          </span>
        )}
        {icon && iconPosition === 'left' && !loading && (
          <span className="button-icon button-icon-left">{icon}</span>
        )}
        {children && <span className="button-content">{children}</span>}
        {icon && iconPosition === 'right' && !loading && (
          <span className="button-icon button-icon-right">{icon}</span>
        )}
      </button>
    </StyledWrapper>
  );
};

export default Button;
