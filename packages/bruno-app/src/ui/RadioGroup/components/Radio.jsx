import React, { forwardRef, useContext } from 'react';
import classnames from 'classnames';
import { RadioGroupContext } from './RadioGroupBase';

/**
 * Radio — a single option inside a RadioGroup.
 *
 * Must be rendered inside a <RadioGroup>. Reads its checked state, name and
 * disabled state from the group context. The ref is forwarded to the underlying
 * <input>, and any extra props (id, required, aria-describedby, autoFocus, …)
 * are forwarded to it too.
 */
const Radio = forwardRef(({ value, label, description, disabled = false, className = '', dataTestId, ...rest }, ref) => {
  const group = useContext(RadioGroupContext);

  if (!group) {
    throw new Error('<Radio> must be rendered inside <RadioGroup>.');
  }

  const { value: groupValue, onChange, name, disabled: groupDisabled } = group;
  const isDisabled = groupDisabled || disabled;
  const checked = groupValue === value;

  const handleChange = (e) => {
    if (isDisabled) return;
    onChange?.(value, e);
  };

  return (
    <label className={classnames('radio', { disabled: isDisabled }, className)}>
      <span className="radio-control">
        <input
          {...rest}
          ref={ref}
          type="radio"
          className="radio-input"
          name={name}
          value={value}
          checked={checked}
          disabled={isDisabled}
          onChange={handleChange}
          data-testid={dataTestId || `radio-${value}`}
        />
        <span className="radio-dot" aria-hidden="true" />
      </span>
      {(label || description) && (
        <span className="radio-text">
          {label && <span className="radio-label">{label}</span>}
          {description && <span className="radio-description">{description}</span>}
        </span>
      )}
    </label>
  );
});

Radio.displayName = 'Radio';

export default Radio;
