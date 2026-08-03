import React, { forwardRef, useEffect, useRef, useCallback } from 'react';
import StyledWrapper from './StyledWrapper';

/**
 * Controlled checkbox. Always pass `checked` + `onChange`.
 */
const CHECKBOX_ICON_VIEWBOX = 16;
const checkboxIconSizeConfig = {
  sm: { iconSize: 8, targetStrokeWidth: 1 },
  md: { iconSize: 10, targetStrokeWidth: 2 },
  lg: { iconSize: 12, targetStrokeWidth: 2 },
  xl: { iconSize: 14, targetStrokeWidth: 2 }
};

function CheckboxIcon({ size, indeterminate }) {
  const { iconSize, targetStrokeWidth } = checkboxIconSizeConfig[size] ?? checkboxIconSizeConfig.md;
  const strokeWidth = (targetStrokeWidth * CHECKBOX_ICON_VIEWBOX) / iconSize;

  return (
    <svg
      className="checkbox-icon"
      width={iconSize}
      height={iconSize}
      viewBox={`0 0 ${CHECKBOX_ICON_VIEWBOX} ${CHECKBOX_ICON_VIEWBOX}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={indeterminate ? 'M4 8H12' : 'M3.5 8.5L6.5 11.5L12.5 4.5'}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const Checkbox = forwardRef(
  (
    {
      checked = false,
      indeterminate = false,
      disabled = false,
      onChange,
      size = 'md',
      label,
      id,
      name,
      value,
      className = '',
      'data-testid': dataTestId = 'checkbox',
      ...rest
    },
    forwardedRef
  ) => {
    const innerRef = useRef(null);

    useEffect(() => {
      const node = innerRef.current;
      if (node) {
        node.indeterminate = !!indeterminate;
      }
    }, [indeterminate]);

    const setRefs = useCallback((node) => {
      innerRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    }, [forwardedRef]);

    const handleChange = (e) => {
      if (disabled) return;
      onChange?.(e);
    };

    return (
      <StyledWrapper $size={size} $disabled={disabled} className={className}>
        <label className="checkbox-root flex items-center gap-2">
          <span className="checkbox-box-wrapper inline-flex items-center justify-center">
            <input
              ref={setRefs}
              type="checkbox"
              id={id}
              name={name}
              value={value}
              checked={checked}
              disabled={disabled}
              onChange={handleChange}
              className="checkbox-input"
              data-testid={dataTestId}
              {...rest}
            />
            <span className="checkbox-box" aria-hidden="true">
              <CheckboxIcon size={size} indeterminate={indeterminate} />
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
