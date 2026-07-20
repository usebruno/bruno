import React, { createContext, useContext } from 'react';
import StyledWrapper from './StyledWrapper';

const RadioGroupContext = createContext(null);

/**
 * Radio — a single option inside a RadioGroup.
 *
 * Must be rendered inside a <RadioGroup>. Reads its checked state, name, size
 * and disabled state from the group context.
 *
 * @param {Object} props
 * @param {string} props.value       - Value this option represents (required)
 * @param {ReactNode} props.label    - Label text shown next to the control
 * @param {ReactNode} props.description - Optional secondary line under the label
 * @param {boolean} props.disabled   - Disable just this option
 * @param {string} props.className   - Additional CSS classes
 * @param {string} props.dataTestId  - Test id for the underlying input
 */
const Radio = ({ value, label, description, disabled = false, className = '', dataTestId }) => {
  const group = useContext(RadioGroupContext);

  if (!group) {
    throw new Error('Radio must be used within a RadioGroup');
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
 * RadioGroup — groups a set of <Radio> options under a single value.
 *
 * @param {Object} props
 * @param {string} props.value        - Currently selected value (controlled)
 * @param {function} props.onChange   - (value, event) => void when selection changes
 * @param {string} props.name         - Shared input name (enables native arrow-key nav)
 * @param {ReactNode} props.label     - Optional group label
 * @param {string} props.orientation  - 'vertical' (default) | 'horizontal'
 * @param {string} props.size         - 'md' (default) | 'sm'
 * @param {boolean} props.disabled    - Disable the whole group
 * @param {string} props.className    - Additional CSS classes
 * @param {string} props.dataTestId   - Test id for the group container
 * @param {ReactNode} props.children  - <Radio> options
 */
const RadioGroup = ({
  value,
  onChange,
  name,
  label,
  orientation = 'vertical',
  size = 'md',
  disabled = false,
  className = '',
  dataTestId = 'radio-group',
  children
}) => {
  const contextValue = { value, onChange, name, size, disabled };

  return (
    <StyledWrapper $orientation={orientation} $size={size} className={className}>
      {label && <div className="radio-group-label">{label}</div>}
      <RadioGroupContext.Provider value={contextValue}>
        <div
          className="radio-group-options"
          role="radiogroup"
          aria-label={typeof label === 'string' ? label : undefined}
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
