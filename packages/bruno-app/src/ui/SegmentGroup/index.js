import React, { createContext, forwardRef, useContext, useId, useMemo } from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

const SegmentGroupContext = createContext(null);
SegmentGroupContext.displayName = 'SegmentGroupContext';

/**
 * Segment — a single option inside a SegmentGroup.
 *
 * Must be rendered inside a <SegmentGroup>. Reads its checked state, name and
 * disabled state from the group context. The ref is forwarded to the underlying
 * <input>, and any extra props (id, required, aria-describedby, autoFocus, …)
 * are forwarded to it too.
 */
const Segment = forwardRef(({ value, label, icon, disabled = false, className = '', dataTestId, ...rest }, ref) => {
  const group = useContext(SegmentGroupContext);

  if (!group) {
    throw new Error('<Segment> must be rendered inside <SegmentGroup>.');
  }

  const { value: groupValue, onChange, name, disabled: groupDisabled } = group;
  const isDisabled = groupDisabled || disabled;
  const checked = groupValue === value;

  const handleChange = (e) => {
    if (isDisabled) return;
    onChange?.(value, e);
  };

  return (
    <label className={classnames('segment', { active: checked, disabled: isDisabled }, className)}>
      <input
        {...rest}
        ref={ref}
        type="radio"
        className="segment-input"
        name={name}
        value={value}
        checked={checked}
        disabled={isDisabled}
        onChange={handleChange}
        data-testid={dataTestId || `segment-${value}`}
      />
      {icon && <span className="segment-icon" aria-hidden="true">{icon}</span>}
      {label && <span className="segment-label">{label}</span>}
    </label>
  );
});

Segment.displayName = 'Segment';

/**
 * SegmentGroup — a segmented control for choosing one option from a small set.
 *
 * Single-select, so it uses radiogroup semantics (a real radio input per
 * segment): native arrow-key navigation and correct screen-reader semantics.
 *
 * The ref is forwarded to the radiogroup container. Additional props are
 * forwarded to that container element.
 */
const SegmentGroup = forwardRef(({
  value,
  onChange,
  name,
  ariaLabel,
  ariaLabelledBy,
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  dataTestId = 'segment-group',
  children,
  ...rest
}, ref) => {
  const generatedId = useId();
  // Native radio grouping needs a shared name; derive a stable one when omitted.
  const groupName = name || `${generatedId}-segment-group`;

  if (process.env.NODE_ENV !== 'production' && !ariaLabel && !ariaLabelledBy) {
    console.warn(
      'SegmentGroup: no accessible name provided. Pass `ariaLabel` or `ariaLabelledBy` so assistive technology can identify the group.'
    );
  }

  const contextValue = useMemo(
    () => ({ value, onChange, name: groupName, disabled }),
    [value, onChange, groupName, disabled]
  );

  return (
    <SegmentGroupContext.Provider value={contextValue}>
      <StyledWrapper
        {...rest}
        ref={ref}
        $size={size}
        $fullWidth={fullWidth}
        className={className}
        role="radiogroup"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        data-testid={dataTestId}
      >
        {children}
      </StyledWrapper>
    </SegmentGroupContext.Provider>
  );
});

SegmentGroup.displayName = 'SegmentGroup';
SegmentGroup.Segment = Segment;

export { Segment };
export default SegmentGroup;
