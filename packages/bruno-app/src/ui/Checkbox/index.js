import React, { forwardRef } from 'react';
import StyledWrapper from './StyledWrapper';

const checkboxIconSizeConfig = {
  sm: { width: 9, height: 6, strokeWidth: 1, path: 'M0.6 3L3.2 5.4L8.4 0.6' },
  md: { width: 11, height: 8, strokeWidth: 2, path: 'M0.8 4L3.9 7.2L10.2 0.8' },
  lg: { width: 12, height: 9, strokeWidth: 2, path: 'M0.9 4.5L4.3 8.1L11.1 0.9' },
  xl: { width: 14, height: 10, strokeWidth: 2, path: 'M1 5L5 9L13 1' }
};

function CheckboxIcon({ size }) {
  const { width, height, strokeWidth, path } = checkboxIconSizeConfig[size] ?? checkboxIconSizeConfig.md;

  return (
    <svg
      className="checkbox-icon"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={path} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Controlled checkbox. Always pass `checked` + `onChange`.
 */
const Checkbox = forwardRef(
  (
    {
      checked = false,
      disabled = false,
      onChange,
      size = 'md',
      label,
      ariaLabel,
      ariaLabelledBy,
      id,
      name,
      value,
      className = '',
      inputClassName = '',
      'data-testid': dataTestId = 'checkbox',
      ...rest
    },
    forwardedRef
  ) => {
    return (
      <StyledWrapper $size={size} $disabled={disabled} className={className}>
        <label className="checkbox-root flex items-center gap-2">
          <span className="checkbox-box-wrapper inline-flex items-center justify-center">
            <input
              ref={forwardedRef}
              type="checkbox"
              id={id}
              name={name}
              value={value}
              checked={checked}
              disabled={disabled}
              onChange={onChange}
              className={`checkbox-input ${inputClassName}`.trim()}
              data-testid={dataTestId}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              {...rest}
            />
            <span className="checkbox-box" aria-hidden="true">
              <CheckboxIcon size={size} />
            </span>
          </span>
          {label && <span className="checkbox-label">{label}</span>}
        </label>
      </StyledWrapper>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export default Checkbox;
