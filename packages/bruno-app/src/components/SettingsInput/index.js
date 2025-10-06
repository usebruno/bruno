import React from 'react';
import { useTheme } from 'providers/Theme';

const SettingsInput = ({
  id,
  label,
  value,
  onChange,
  type = 'number',
  min = 0,
  max = 999999,
  className = '',
  description = '',
  onKeyDown
}) => {
  const { theme } = useTheme();

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-900 dark:text-gray-100" htmlFor={id}>
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-700 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <input
        id={id}
        type={type}
        className={`block px-2 py-1 rounded-sm outline-none transition-colors duration-100 min-w-20 ${className}`}
        style={{
          backgroundColor: theme.modal.input.bg,
          border: `1px solid ${theme.modal.input.border}`
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        {...(type === 'number' && {
          min,
          ...(max !== undefined && { max })
        })}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
};

export default SettingsInput;
