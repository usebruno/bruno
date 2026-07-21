import React, { forwardRef } from 'react';
import RadioGroupBase from './RadioGroupBase';
import Radio from './Radio';

/**
 * RadioGroup — the public, data-driven radio group.
 *
 * Takes an `items` array — [{ value, label, description?, disabled?, dataTestId?, ... }] —
 * and renders the radios for you. All other props (value, onChange, name, label,
 * orientation, size, disabled, ariaLabel/ariaLabelledBy, …) are forwarded to the
 * underlying group; the ref lands on the root element.
 *
 * The compound building blocks (RadioGroupBase + Radio) are kept internal — if a
 * compound API is ever needed, expose them from index.jsx.
 *
 * @example
 * <RadioGroup
 *   value={value}
 *   onChange={setValue}
 *   label="Proxy mode"
 *   items={[{ value: 'off', label: 'Off' }, { value: 'manual', label: 'Manual' }]}
 * />
 */
const RadioGroup = forwardRef(({ items = [], ...props }, ref) => (
  <RadioGroupBase ref={ref} {...props}>
    {items.map(({ value, label, description, disabled, dataTestId, ...rest }) => (
      <Radio
        key={value}
        value={value}
        label={label}
        description={description}
        disabled={disabled}
        dataTestId={dataTestId}
        {...rest}
      />
    ))}
  </RadioGroupBase>
));

RadioGroup.displayName = 'RadioGroup';

export default RadioGroup;
