import React from 'react';
import { IconChevronDown, IconX } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import Dropdown from 'components/Dropdown';

const InheritableSettingsInput = ({
  id,
  label,
  value,
  description,
  onKeyDown,
  isInherited,
  onDropdownSelect,
  onValueChange,
  onCustomValueReset
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
      <div className="flex items-center justify-end">
        {isInherited ? (
          <Dropdown
            icon={(
              <button
                type="button"
                className="px-2 py-1 text-xs rounded-sm outline-none transition-colors duration-100 w-24 h-8 flex items-center justify-between"
                style={{
                  backgroundColor: theme.modal.input.bg,
                  border: `1px solid ${theme.modal.input.border}`,
                  color: theme.modal.input.text
                }}
              >
                <span>Inherit</span>
                <IconChevronDown size={12} />
              </button>
            )}
          >
            <div className="dropdown-item" onClick={() => onDropdownSelect('inherit')}>
              Inherit
            </div>
            <div className="dropdown-item" onClick={() => onDropdownSelect('custom')}>
              Custom
            </div>
          </Dropdown>
        ) : (
          <div className="relative">
            <input
              id={id}
              type="text"
              className="block px-2 py-1 pr-6 rounded-sm outline-none transition-colors duration-100 w-24 h-8"
              style={{
                backgroundColor: theme.modal.input.bg,
                border: `1px solid ${theme.modal.input.border}`,
                color: theme.modal.input.text
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              defaultValue={value}
              onChange={onValueChange}
              onKeyDown={onKeyDown}
            />
            <button
              type="button"
              onClick={onCustomValueReset}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              title="Reset to inherit"
            >
              <IconX size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InheritableSettingsInput;
