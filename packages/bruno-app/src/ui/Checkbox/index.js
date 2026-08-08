import React, { useRef, useEffect, useId } from 'react';
import { IconCheck, IconMinus } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const ICON_SIZES = { sm: 10, md: 12 };

/**
 * Checkbox - A reusable checkbox component
 *
 * @param {boolean} props.checked - Controlled checked state
 * @param {function} props.onChange - Called with the native change event
 * @param {boolean} props.defaultChecked - Initial state for uncontrolled usage
 * @param {boolean} props.indeterminate - Indeterminate state (overrides checked visually)
 * @param {boolean} props.disabled - Disables interaction
 * @param {string|ReactNode} props.label - Label text
 * @param {string} props.description - Description below label
 * @param {'left'|'right'} props.labelPosition - Label placement (default: 'right')
 * @param {string} props.id - Input id
 * @param {string} props.name - Input name
 * @param {string} props.value - Input value for form submission
 * @param {string} props.error - Error message
 * @param {string} props.color - Override accent color
 * @param {string} props.iconColor - Checkmark color (default: white)
 * @param {ReactNode} props.icon - Custom icon for checked state
 * @param {'sm'|'md'|number} props.radius - Border radius (default: 'sm')
 * @param {'sm'|'md'} props.size - Checkbox size (default: 'md')
 * @param {string} props.className - Additional CSS class
 */
const Checkbox = ({
  checked,
  onChange,
  defaultChecked,
  indeterminate = false,
  disabled = false,
  label,
  description,
  labelPosition = 'right',
  id,
  name,
  value,
  error,
  color,
  iconColor,
  icon,
  radius = 'sm',
  size = 'md',
  className,
  'data-testid': testId
}) => {
  const inputRef = useRef(null);
  const autoId = useId();
  const inputId = id || autoId;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const iconSize = ICON_SIZES[size] || 12;
  const labelId = label ? `${inputId}-label` : undefined;
  const descId = description ? `${inputId}-desc` : undefined;
  const errId = error ? `${inputId}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(' ') || undefined;

  const handleClick = (e) => {
    e.stopPropagation();
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const checkedIcon = icon || (
    indeterminate
      ? <IconMinus size={iconSize} strokeWidth={3} />
      : <IconCheck size={iconSize} strokeWidth={3} />
  );

  return (
    <StyledWrapper
      className={className}
      $size={size}
      $disabled={disabled}
      $labelPosition={labelPosition}
      $color={color}
      $iconColor={iconColor}
      $radius={radius}
      onClick={handleClick}
    >
      <div className="checkbox-box">
        <input
          ref={inputRef}
          type="checkbox"
          className={`checkbox-input ${indeterminate ? 'checkbox-indeterminate' : ''}`}
          id={inputId}
          name={name}
          data-testid={testId}
          value={value}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={onChange}
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="checkbox-icon">{checkedIcon}</span>
      </div>
      {(label || description || error) && (
        <div className="checkbox-label-content">
          {label && <span id={labelId} className="checkbox-label">{label}</span>}
          {description && <span id={descId} className="checkbox-description">{description}</span>}
          {error && <span id={errId} className="checkbox-error">{error}</span>}
        </div>
      )}
    </StyledWrapper>
  );
};

export default Checkbox;
