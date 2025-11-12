import React from 'react';

const ToggleSelector = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'small', // 'small', 'medium', 'large'
  'data-testid': dataTestId
}) => {
  const sizeClasses = {
    small: {
      container: 'h-4 w-8',
      thumb: 'h-3 w-3',
      translate: checked ? 'translate-x-4' : 'translate-x-1'
    },
    medium: {
      container: 'h-5 w-9',
      thumb: 'h-3 w-3',
      translate: checked ? 'translate-x-5' : 'translate-x-1'
    },
    large: {
      container: 'h-6 w-11',
      thumb: 'h-4 w-4',
      translate: checked ? 'translate-x-6' : 'translate-x-1'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-900 dark:text-gray-100">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-700 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        data-testid={dataTestId}
        className={`
          relative inline-flex ${currentSize.container} flex-shrink-0 items-center rounded-full transition-colors
          focus:outline-none focus:ring-1 focus:ring-offset-1
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer'
          }
          ${checked
            ? 'bg-blue-600 dark:bg-blue-500'
            : 'bg-gray-200 dark:bg-gray-700'
          }
        `}
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
      >
        <span
          className={`
            inline-block ${currentSize.thumb} transform rounded-full bg-white transition-transform
            ${currentSize.translate}
          `}
        />
      </button>
    </div>
  );
};

export default ToggleSelector;