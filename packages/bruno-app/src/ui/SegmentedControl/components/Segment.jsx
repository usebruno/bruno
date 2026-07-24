import React, { forwardRef, useContext } from 'react';
import classnames from 'classnames';
import { SegmentedControlContext } from './SegmentedControlBase';

/**
 * Segment — a single option inside a SegmentedControl.
 *
 * Must be rendered inside a <SegmentedControl>. Reads its checked state, name
 * and disabled state from the group context. The ref is forwarded to the
 * underlying <input>, and any extra props (id, required, aria-describedby,
 * autoFocus, …) are forwarded to it too.
 */
const Segment = forwardRef(({ value, label, icon, disabled = false, className = '', dataTestId, ...rest }, ref) => {
  const group = useContext(SegmentedControlContext);

  if (!group) {
    throw new Error('<Segment> must be rendered inside <SegmentedControl>.');
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

export default Segment;
