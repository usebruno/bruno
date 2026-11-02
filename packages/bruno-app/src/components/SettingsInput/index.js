import React from 'react';
import SettingsRow from 'components/SettingsRow';
import StyledWrapper from './StyledWrapper';

const SettingsInput = ({
  id,
  label,
  value,
  onChange,
  className = '',
  description = '',
  onKeyDown
}) => {
  return (
    <StyledWrapper>
      <SettingsRow label={label} description={description} htmlFor={id}>
        <input
          id={id}
          type="text"
          className={`settings-text-input block px-2 py-1 w-32 h-[34px] ${className}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      </SettingsRow>
    </StyledWrapper>
  );
};

export default SettingsInput;
