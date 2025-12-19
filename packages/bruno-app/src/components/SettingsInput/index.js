import React from 'react';
import { useTheme } from 'providers/Theme';
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
  const { theme } = useTheme();

  return (
    <StyledWrapper>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <label className="settings-label text-xs font-medium" htmlFor={id}>
            {label}
          </label>
          {description && (
            <p className="settings-description text-xs">
              {description}
            </p>
          )}
        </div>
        <input
          id={id}
          type="text"
          className={`block px-2 py-1 rounded-sm outline-none transition-colors duration-100 w-24 h-8 ${className}`}
          style={{
            backgroundColor: theme.modal.input.bg,
            border: `1px solid ${theme.modal.input.border}`
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      </div>
    </StyledWrapper>
  );
};

export default SettingsInput;
