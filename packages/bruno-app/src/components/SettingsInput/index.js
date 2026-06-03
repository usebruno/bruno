import React from 'react';
import { useTheme } from 'providers/Theme';

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
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col flex-1 min-w-0">
        <label className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" htmlFor={id}>
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-700 dark:text-gray-400 truncate">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        <input
          id={id}
          type="text"
          className={`block px-2 py-1 rounded-sm outline-none transition-colors duration-100 w-24 h-8 ${className}`}
          style={{
            backgroundColor: theme.input.bg,
            border: `1px solid ${theme.input.border}`
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
    </div>
  );
};

export default SettingsInput;
