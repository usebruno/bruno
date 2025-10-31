import React from 'react';
import StyledWrapper from './StyledWrapper';
import IconCheckMark from 'components/Icons/IconCheckMark';
import { useTheme } from 'providers/Theme';

const Checkbox = ({
  checked = false,
  disabled = false,
  onChange,
  className = '',
  id,
  name,
  value,
  dataTestId = 'checkbox'
}) => {
  const { theme } = useTheme();

  const handleChange = (e) => {
    if (!disabled && onChange) {
      onChange(e);
    }
  };

  return (
    <StyledWrapper checked={checked} disabled={disabled} className={className}>
      <div className="checkbox-container">
        <input
          type="checkbox"
          id={id}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="checkbox-input"
          data-testid={dataTestId}
        />
        <IconCheckMark className="checkbox-checkmark" color={theme.examples.checkbox.color} size={14} />
      </div>

    </StyledWrapper>
  );
};

export default Checkbox;
