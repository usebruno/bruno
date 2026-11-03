import React from 'react';
import SettingsField from 'ui/patterns/SettingsField';
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
      <SettingsField
        layout="inline"
        label={label}
        description={description}
        htmlFor={id}
        descriptionId={description ? `${id}-description` : undefined}
      >
        <input
          id={id}
          aria-describedby={description ? `${id}-description` : undefined}
          type="text"
          className={`settings-text-input block px-2 py-1 w-24 h-[34px] ${className}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      </SettingsField>
    </StyledWrapper>
  );
};

export default SettingsInput;
