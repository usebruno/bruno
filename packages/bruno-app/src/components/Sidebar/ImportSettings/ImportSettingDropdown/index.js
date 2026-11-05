import { useRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { stopEnterFromConfirmingModal } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const ImportSettingDropdown = ({ options, value, onChange, testId, disabled = false }) => {
  const wrapperRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  const focusTrigger = () => wrapperRef.current.querySelector('.setting-dropdown-trigger').focus();
  const returnFocusOnEscape = (event) => {
    if (event.key === 'Escape') {
      focusTrigger();
    }
  };

  const items = options.map((option) => ({
    id: option.value,
    label: option.label,
    onClick: () => {
      onChange(option.value);
      focusTrigger();
    }
  }));

  return (
    <StyledWrapper ref={wrapperRef} onKeyDownCapture={returnFocusOnEscape}>
      <MenuDropdown items={items} selectedItemId={selectedOption.value} data-testid={`${testId}-option`}>
        <button
          type="button"
          className="setting-dropdown-trigger flex items-center gap-1"
          disabled={disabled}
          onKeyDown={stopEnterFromConfirmingModal}
          data-testid={`${testId}-dropdown`}
        >
          <span className="setting-dropdown-label font-medium">
            <span>{selectedOption.label}</span>
            {options.map((option) => (
              <span key={option.value} className="setting-dropdown-label-sizer" data-label={option.label} aria-hidden="true" />
            ))}
          </span>
          <IconCaretDown size={16} fill="currentColor" aria-hidden="true" />
        </button>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default ImportSettingDropdown;
