import React, { createContext, forwardRef, useId, useMemo } from 'react';
import StyledWrapper from './StyledWrapper';

/**
 * Context shared with the <Segment> children: selected value, change handler,
 * the group's input name, and the group-level disabled flag.
 */
export const SegmentedControlContext = createContext(null);
SegmentedControlContext.displayName = 'SegmentedControlContext';

/**
 * SegmentedControlBase — the compound implementation of the segmented control.
 *
 * Internal: not exported from the package's public entry (index.jsx), which
 * exposes only the data-driven list API. Kept as a compound component (context
 * + <Segment> children) so a compound API can be surfaced later with no rewrite.
 *
 * Single-select, so it uses radiogroup semantics (a real radio input per
 * segment): native arrow-key navigation and correct screen-reader semantics.
 * Owns the context, renders the radiogroup, and handles accessibility,
 * controlled state, sizing, and the disabled state. The ref is forwarded to the
 * radiogroup container; additional props are forwarded to that element.
 */
const SegmentedControlBase = forwardRef(({
  value,
  onChange,
  name,
  ariaLabel,
  ariaLabelledBy,
  size = 'md',
  variant = 'solid',
  fullWidth = false,
  disabled = false,
  className = '',
  dataTestId = 'segmented-control',
  children,
  ...rest
}, ref) => {
  const generatedId = useId();
  // Native radio grouping needs a shared name; derive a stable one when omitted.
  const groupName = name || `${generatedId}-segmented-control`;

  if (process.env.NODE_ENV !== 'production' && !ariaLabel && !ariaLabelledBy) {
    console.warn(
      'SegmentedControl: no accessible name provided. Pass `ariaLabel` or `ariaLabelledBy` so assistive technology can identify the group.'
    );
  }

  const contextValue = useMemo(
    () => ({ value, onChange, name: groupName, disabled }),
    [value, onChange, groupName, disabled]
  );

  // Emit only one accessible-name attribute (aria-labelledby wins over aria-label).
  const ariaProps = ariaLabelledBy
    ? { 'aria-labelledby': ariaLabelledBy }
    : ariaLabel
      ? { 'aria-label': ariaLabel }
      : {};

  return (
    <SegmentedControlContext.Provider value={contextValue}>
      <StyledWrapper
        {...rest}
        ref={ref}
        $size={size}
        $variant={variant}
        $fullWidth={fullWidth}
        className={className}
        role="radiogroup"
        {...ariaProps}
        data-testid={dataTestId}
      >
        {children}
      </StyledWrapper>
    </SegmentedControlContext.Provider>
  );
});

SegmentedControlBase.displayName = 'SegmentedControlBase';

export default SegmentedControlBase;
