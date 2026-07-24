import React, { forwardRef } from 'react';
import SegmentedControlBase from './SegmentedControlBase';
import Segment from './Segment';

/**
 * SegmentedControl — the public, data-driven segmented control.
 *
 * Takes an `items` array — [{ value, label, icon?, disabled?, dataTestId?, ... }] —
 * and renders the segments for you. All other props (value, onChange, name,
 * size, variant, fullWidth, disabled, ariaLabel/ariaLabelledBy, …) are forwarded
 * to the underlying control; the ref lands on the radiogroup container.
 *
 * `variant`: 'solid' (default, recessed track) | 'outlined' (bordered container).
 *
 * The compound building blocks (SegmentedControlBase + Segment) are kept
 * internal — if a compound API is ever needed, expose them from index.jsx.
 *
 * @example
 * <SegmentedControl
 *   value={value}
 *   onChange={setValue}
 *   ariaLabel="Request type"
 *   items={[{ value: 'http', label: 'HTTP' }, { value: 'graphql', label: 'GraphQL' }]}
 * />
 */
const SegmentedControl = forwardRef(({ items = [], ...props }, ref) => (
  <SegmentedControlBase ref={ref} {...props}>
    {items.map(({ value, label, icon, disabled, dataTestId, ...rest }) => (
      <Segment
        key={value}
        value={value}
        label={label}
        icon={icon}
        disabled={disabled}
        dataTestId={dataTestId}
        {...rest}
      />
    ))}
  </SegmentedControlBase>
));

SegmentedControl.displayName = 'SegmentedControl';

export default SegmentedControl;
