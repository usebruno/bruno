import React from 'react';
import { useTheme } from 'providers/Theme';

const NumberInput = ({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 999999,
  className = '',
  description = '',
  onSave,
  onRun
}) => {
  const { theme } = useTheme();
  const handleChange = (e) => {
    const inputValue = e.target.value;
    const numericValue = inputValue ? parseInt(inputValue, 10) : null;
    onChange(numericValue);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (onSave) {
        onSave();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (onRun) {
        onRun();
      }
    }
  };

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
        type="number"
        className={`block px-2 py-1 rounded-sm outline-none transition-colors duration-100 min-w-20 ${className}`}
        style={{
          backgroundColor: theme.modal.input.bg,
          border: `1px solid ${theme.modal.input.border}`
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default NumberInput;
