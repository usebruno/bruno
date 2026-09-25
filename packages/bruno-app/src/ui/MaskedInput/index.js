import React, { useState } from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons';
import InputWrapper from 'ui/InputWrapper';
import StyledWrapper from './StyledWrapper';

/**
 * MaskedInput - A password/secret input with visibility toggle
 *
 * @param {string} props.value - Controlled input value
 * @param {function} props.onChange - Called with the input change event
 * @param {string} props.id - Input id attribute
 * @param {string} props.name - Input name attribute (defaults to id)
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Disables input and hides toggle
 * @param {string} props.error - Error message displayed below the input
 * @param {string} props.label - Label text displayed above the input
 * @param {string} props.description - Description text displayed below the label
 * @param {boolean} props.required - Shows asterisk on label
 * @param {boolean} props.visible - Controlled visibility state
 * @param {function} props.onVisibilityChange - Called when visibility toggles: (visible: boolean) => void
 * @param {ReactNode} props.leftSection - Element rendered on the left side of the input
 * @param {ReactNode} props.rightSection - Element rendered after the visibility toggle
 * @param {string} props.className - Additional CSS class for the wrapper
 */
const MaskedInput = ({
  value,
  onChange,
  id,
  name,
  placeholder,
  disabled = false,
  error,
  label,
  description,
  required = false,
  visible: controlledVisible,
  onVisibilityChange,
  leftSection,
  rightSection,
  size = 'md',
  className,
  'data-testid': testId
}) => {
  const [internalVisible, setInternalVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isControlled = controlledVisible !== undefined;
  const isVisible = isControlled ? controlledVisible : internalVisible;

  const handleToggle = () => {
    if (disabled) return;
    const next = !isVisible;
    if (isControlled) {
      onVisibilityChange?.(next);
    } else {
      setInternalVisible(next);
    }
  };

  const wrapperClasses = [
    'masked-input-wrapper',
    'textbox',
    isFocused ? 'masked-input-focused' : '',
    error ? 'masked-input-error' : '',
    disabled ? 'masked-input-disabled' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <InputWrapper label={label} description={description} error={error} htmlFor={id} required={required} size={size} className={className}>
      <StyledWrapper $size={size}>
        <div className={wrapperClasses}>
          {leftSection && <span className="masked-input-left-section">{leftSection}</span>}
          <input
            id={id}
            type={isVisible ? 'text' : 'password'}
            name={name || id}
            className="masked-input-field"
            value={value}
            onChange={onChange}
            data-testid={testId}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {!disabled && (
            <button type="button" className="masked-input-toggle" onClick={handleToggle} aria-label={isVisible ? 'Hide value' : 'Show value'}>
              {isVisible ? <IconEyeOff size={16} strokeWidth={2} /> : <IconEye size={16} strokeWidth={2} />}
            </button>
          )}
          {rightSection && <span className="masked-input-right-section">{rightSection}</span>}
        </div>
      </StyledWrapper>
    </InputWrapper>
  );
};

export default MaskedInput;
