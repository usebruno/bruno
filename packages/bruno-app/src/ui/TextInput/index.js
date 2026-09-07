import React, { useState } from 'react';
import InputWrapper from 'ui/InputWrapper';
import StyledWrapper from './StyledWrapper';

/**
 * TextInput - A form text input component
 *
 * @param {string} props.value - Controlled input value
 * @param {function} props.onChange - Called with the input change event
 * @param {string} props.id - Input id attribute
 * @param {string} props.name - Input name attribute (defaults to id)
 * @param {string} props.type - Input type: 'text' | 'number' | 'email' | 'url' (default: 'text')
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Disables the input
 * @param {string} props.error - Error message displayed below the input
 * @param {string} props.label - Label text displayed above the input
 * @param {string} props.description - Description text below the label
 * @param {boolean} props.required - Shows asterisk on label
 * @param {ReactNode} props.leftSection - Element rendered on the left side
 * @param {ReactNode} props.rightSection - Element rendered on the right side
 * @param {string} props.size - Input size: 'sm' | 'md' (default: 'md')
 * @param {string} props.className - Additional CSS class for the wrapper
 * @param {boolean} props.autoFocus - Auto-focus on mount
 * @param {boolean} props.readOnly - Makes input read-only
 * @param {string} props.autoComplete - HTML autoComplete attribute
 * @param {number} props.maxLength - Max character length
 * @param {number} props.min - Min value for type="number"
 * @param {number} props.max - Max value for type="number"
 * @param {number} props.step - Step value for type="number"
 */
const TextInput = ({
  value,
  onChange,
  id,
  name,
  type = 'text',
  placeholder,
  disabled = false,
  error,
  label,
  description,
  required = false,
  leftSection,
  rightSection,
  size = 'md',
  className,
  autoFocus,
  readOnly,
  autoComplete,
  maxLength,
  min,
  max,
  step,
  'data-testid': testId
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const wrapperClasses = [
    'text-input-wrapper',
    'textbox',
    isFocused ? 'text-input-focused' : '',
    error ? 'text-input-error' : '',
    disabled ? 'text-input-disabled' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <InputWrapper
      label={label}
      description={description}
      error={error}
      htmlFor={id}
      required={required}
      size={size}
      className={className}
    >
      <StyledWrapper $size={size}>
        <div className={wrapperClasses}>
          {leftSection && <span className="text-input-left-section">{leftSection}</span>}
          <input
            id={id}
            type={type}
            name={name || id}
            className="text-input-field"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            data-testid={testId}
            readOnly={readOnly}
            autoFocus={autoFocus}
            autoComplete={autoComplete}
            maxLength={maxLength}
            min={min}
            max={max}
            step={step}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {rightSection && <span className="text-input-right-section">{rightSection}</span>}
        </div>
      </StyledWrapper>
    </InputWrapper>
  );
};

export default TextInput;
