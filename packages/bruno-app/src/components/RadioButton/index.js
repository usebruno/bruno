import React from 'react';
import StyledWrapper from './StyledWrapper';

const RadioButton = ({
  checked,
  disabled = false,
  onChange,
  name,
  value,
  id,
  className = '',
  ...rest // Allow passing through additional HTML attributes like data-testid, aria-label, aria-labelledby, role, tabIndex, etc.
}) => {
  const handleChange = (e) => {
    if (!disabled && onChange) {
      onChange(e);
    }
  };

  return (
    <StyledWrapper>
      <div className={`radio-container ${className}`}>
        <input
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="radio-input"
          {...rest}
        />
        <label htmlFor={id} className="radio-label" />
      </div>
    </StyledWrapper>
  );
};

export default RadioButton;
