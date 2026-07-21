import React, { createContext, forwardRef, useContext, useId, useMemo } from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

const RadioGroupContext = createContext(null);
RadioGroupContext.displayName = 'RadioGroupContext';

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

/**
 * RadioGroup — a controlled group of <Radio> options.
 *
 * Uses native radio inputs for keyboard navigation and accessibility. If no
 * `name` is provided, one is generated automatically.
 *
 * The radiogroup always receives an accessible name. Pass `label` to render a
 * visible label, `ariaLabelledBy` to reference an external label, or
 * `ariaLabel` when no visible label exists.
 *
 * The ref is forwarded to the component's root element. Additional props are
 * forwarded to the radiogroup container.
 */
const RadioGroup = forwardRef(({
  value,
  onChange,
  name,
  label,
  ariaLabel,
  ariaLabelledBy,
  orientation = 'vertical',
  size = 'md',
  disabled = false,
  className = '',
  dataTestId = 'radio-group',
  children,
  ...rest
}, ref) => {
  const generatedId = useId();
  const groupName = name || `${generatedId}-group`;
  const labelId = label ? `${generatedId}-label` : undefined;
  const resolvedLabelledBy = ariaLabelledBy || labelId;
  const resolvedLabel = resolvedLabelledBy ? undefined : ariaLabel;

  if (process.env.NODE_ENV !== 'production' && !resolvedLabelledBy && !resolvedLabel) {
    console.warn(
      'RadioGroup is missing an accessible name. Provide `label`, `ariaLabel`, or `ariaLabelledBy`.'
    );
  }

  const contextValue = useMemo(
    () => ({ value, onChange, name: groupName, disabled }),
    [value, onChange, groupName, disabled]
  );

  return (
    <StyledWrapper ref={ref} $orientation={orientation} $size={size} className={className}>
      {label && (
        <div className="radio-group-label" id={labelId}>
          {label}
        </div>
      )}
      <RadioGroupContext.Provider value={contextValue}>
        <div
          {...rest}
          className="radio-group-options"
          role="radiogroup"
          aria-labelledby={resolvedLabelledBy}
          aria-label={resolvedLabel}
          data-testid={dataTestId}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    </StyledWrapper>
  );
});

RadioGroup.displayName = 'RadioGroup';
RadioGroup.Radio = Radio;

export { Radio };
export default RadioGroup;
