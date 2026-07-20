import React, { createContext, useContext, useId, useMemo } from 'react';
import StyledWrapper from './StyledWrapper';

const RadioGroupContext = createContext(null);

/**
 * Radio — a single option inside a RadioGroup.
 *
 * Must be rendered inside a <RadioGroup>. Reads its checked state, name and
 * disabled state from the group context.
 */
const Radio = ({ value, label, description, disabled = false, className = '', dataTestId }) => {
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
    <label className={`radio ${isDisabled ? 'disabled' : ''} ${className}`.trim()}>
      <span className="radio-control">
        <input
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
};

/**
 * RadioGroup — a controlled group of <Radio> options.
 *
 * Uses native radio inputs for keyboard navigation and accessibility. If no
 * `name` is provided, one is generated automatically.
 *
 * The radiogroup always receives an accessible name. Pass `label` to render a
 * visible label, `ariaLabelledBy` to reference an external label, or
 * `ariaLabel` when no visible label exists.
 */
const RadioGroup = ({
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
}) => {
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
    <StyledWrapper $orientation={orientation} $size={size} className={className}>
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
};

RadioGroup.Radio = Radio;

export { Radio };
export default RadioGroup;

RadioGroupContext.displayName = 'RadioGroupContext';
