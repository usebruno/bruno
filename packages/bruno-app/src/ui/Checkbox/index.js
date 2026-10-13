import React, { forwardRef, useLayoutEffect, useMemo, useRef } from 'react';
import StyledWrapper from './StyledWrapper';

const ICON_CONFIG = {
  sm: {
    check: {
      width: 9,
      height: 7,
      strokeWidth: 1.75,
      path: 'M1.25 3.25L3.5 5.5L7.75 1.25'
    },
    indeterminate: { width: 8, height: 4, strokeWidth: 1.5 }
  },
  md: {
    check: {
      width: 11,
      height: 9,
      strokeWidth: 2,
      path: 'M1.5 4.25L4.25 7L9.5 1.5'
    },
    indeterminate: { width: 9, height: 4, strokeWidth: 2 }
  },
  lg: {
    check: {
      width: 12,
      height: 10,
      strokeWidth: 2.25,
      path: 'M1.5 4.75L4.75 8L10.5 1.5'
    },
    indeterminate: { width: 10, height: 4, strokeWidth: 2 }
  },
  xl: {
    check: {
      width: 14,
      height: 11,
      strokeWidth: 2.5,
      path: 'M1.75 5.25L5.5 9L12.25 1.75'
    },
    indeterminate: { width: 11, height: 4, strokeWidth: 2 }
  }
};

// Horizontal space between the ends of the minus line and the edge of its SVG.
const INDETERMINATE_PADDING = 1.5;

const DEFAULT_SIZE = 'md';

function getIconConfig(size) {
  return ICON_CONFIG[size] ?? ICON_CONFIG[DEFAULT_SIZE];
}

function CheckboxIcon({ size }) {
  const { width, height, strokeWidth, path } = getIconConfig(size).check;

  return (
    <svg
      className="checkbox-icon"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IndeterminateIcon({ size }) {
  const { width, height, strokeWidth } = getIconConfig(size).indeterminate;

  return (
    <svg
      className="checkbox-icon"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        x1={INDETERMINATE_PADDING + strokeWidth / 2}
        y1={height / 2}
        x2={width - INDETERMINATE_PADDING - strokeWidth / 2}
        y2={height / 2}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

function useIndeterminateSync(ref, indeterminate, onChange) {
  // `indeterminate` is a DOM property, not an HTML attribute. React doesn't
  // manage it, and the browser clears it on every click.
  const sync = () => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  };

  useLayoutEffect(sync);

  return (event) => {
    onChange?.(event);
    sync();
  };
}

function assignRef(ref, node) {
  if (typeof ref === 'function') {
    ref(node);
  } else if (ref) {
    ref.current = node;
  }
}

function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => assignRef(ref, node));
  };
}

/**
 * Controlled checkbox. Always pass `checked` + `onChange`.
 */
const Checkbox = forwardRef(
  (
    {
      checked = false,
      indeterminate = false,
      disabled = false,
      required = false,
      onChange,
      size = DEFAULT_SIZE,
      label,
      ariaLabel,
      ariaLabelledBy,
      id,
      name,
      value,
      className = '',
      inputClassName = '',
      'data-testid': dataTestId
    },
    forwardedRef
  ) => {
    const inputRef = useRef(null);
    const mergedRef = useMemo(() => mergeRefs(inputRef, forwardedRef), [inputRef, forwardedRef]);

    const handleChange = useIndeterminateSync(inputRef, indeterminate, onChange);

    return (
      <StyledWrapper
        $size={size}
        $disabled={disabled}
        className={className}
      >
        <label className="checkbox-root flex items-center gap-2">
          <span className="checkbox-box-wrapper inline-flex items-center justify-center">
            <input
              ref={mergedRef}
              type="checkbox"
              id={id}
              name={name}
              value={value}
              checked={checked}
              disabled={disabled}
              required={required}
              onChange={handleChange}
              className={`checkbox-input ${inputClassName}`.trim()}
              data-testid={dataTestId}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
            />

            <span className="checkbox-box" aria-hidden="true">
              {indeterminate ? (
                <IndeterminateIcon size={size} />
              ) : (
                <CheckboxIcon size={size} />
              )}
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
