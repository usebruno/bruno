import React from 'react';
import { IconChevronDown, IconX } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import SettingsRow from 'components/SettingsRow';
import StyledWrapper from './StyledWrapper';

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
  return (
    <StyledWrapper>
      <SettingsRow label={label} description={description} htmlFor={id}>
        {isInherited ? (
          <Dropdown
            appendTo={() => document.body}
            icon={(
              <button
                type="button"
                className="settings-text-input px-2 py-1 text-xs w-32 h-[34px] flex items-center justify-between"
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
              className="settings-text-input block px-2 py-1 pr-6 w-32 h-[34px]"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={value}
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
      </SettingsRow>
    </StyledWrapper>
  );
};

export default InheritableSettingsInput;
