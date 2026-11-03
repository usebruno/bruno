import React, { useId } from 'react';
import { useTheme } from 'providers/Theme';
import SettingsField from 'ui/patterns/SettingsField';

const ToggleSelector = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'small', // 'small', 'medium', 'large'
  'data-testid': dataTestId
}) => {
  const { theme } = useTheme();
  const switchId = useId();

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
    <SettingsField
      layout="inline"
      label={label}
      description={description}
      htmlFor={switchId}
      descriptionId={description ? `${switchId}-description` : undefined}
    >
      <button
        id={switchId}
        aria-describedby={description ? `${switchId}-description` : undefined}
        type="button"
        onClick={onChange}
        disabled={disabled}
        data-testid={dataTestId}
        style={{
          backgroundColor: checked ? theme.primary.solid : theme.background.surface2
        }}
        className={`
          relative inline-flex ${currentSize.container} flex-shrink-0 items-center rounded-full transition-colors
          focus:outline-none focus:ring-1 focus:ring-offset-1
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
    </SettingsField>
  );
};

export default ToggleSelector;
