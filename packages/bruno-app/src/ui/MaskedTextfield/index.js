import React, { useState } from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons';
import InputWrapper from 'ui/InputWrapper';
import StyledWrapper from './StyledWrapper';

/**
 * MaskedTextfield - A multiline secret input with visibility toggle
 *
 * The multiline counterpart to MaskedInput, for secrets whose line breaks are part of the value
 * (PEM keys, certificates). A single-line `<input>` cannot hold them: the browser strips newlines
 * from typed and pasted text, silently corrupting the key. A textarea has no `type="password"`,
 * so masking is done with `-webkit-text-security`.
 *
 * @param {string} props.value - Controlled input value
 * @param {function} props.onChange - Called with the textarea change event
 * @param {string} props.id - Textarea id attribute
 * @param {string} props.name - Textarea name attribute (defaults to id)
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.rows - Visible rows (default: 4)
 * @param {boolean} props.disabled - Disables input and hides toggle
 * @param {string} props.error - Error message displayed below the input
 * @param {string} props.label - Label text displayed above the input
 * @param {string} props.description - Description text displayed below the label
 * @param {boolean} props.required - Shows asterisk on label
 * @param {boolean} props.visible - Controlled visibility state
 * @param {function} props.onVisibilityChange - Called when visibility toggles: (visible: boolean) => void
 * @param {string} props.className - Additional CSS class for the wrapper
 */
const MaskedTextfield = ({
  value,
  onChange,
  id,
  name,
  placeholder,
  rows = 2,
  disabled = false,
  error,
  label,
  description,
  required = false,
  visible: controlledVisible,
  onVisibilityChange,
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
    'masked-textfield-wrapper',
    'textbox',
    isFocused ? 'masked-textfield-focused' : '',
    error ? 'masked-textfield-error' : '',
    disabled ? 'masked-textfield-disabled' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const fieldClasses = isVisible ? 'masked-textfield-field' : 'masked-textfield-field masked-textfield-obscured';

  return (
    <InputWrapper label={label} description={description} error={error} htmlFor={id} required={required} size={size} className={className}>
      <StyledWrapper $size={size}>
        <div className={wrapperClasses}>
          <textarea
            id={id}
            name={name || id}
            className={fieldClasses}
            value={value}
            onChange={onChange}
            rows={rows}
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
            <button type="button" className="masked-textfield-toggle" onClick={handleToggle} aria-label={isVisible ? 'Hide value' : 'Show value'}>
              {isVisible ? <IconEyeOff size={16} strokeWidth={2} /> : <IconEye size={16} strokeWidth={2} />}
            </button>
          )}
        </div>
      </StyledWrapper>
    </InputWrapper>
  );
};

export default MaskedTextfield;
