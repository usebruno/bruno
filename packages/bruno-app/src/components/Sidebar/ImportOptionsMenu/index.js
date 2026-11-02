import { useRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { stopEnterFromConfirmingModal } from 'utils/common';

const ImportOptionsMenu = ({ showFileFormat, onToggleFileFormat }) => {
  const wrapperRef = useRef(null);

  const focusTrigger = () => wrapperRef.current.querySelector('.btn-advanced').focus();
  const returnFocusOnEscape = (event) => {
    if (event.key === 'Escape') {
      focusTrigger();
    }
  };

  const items = [
    {
      id: 'toggle',
      label: showFileFormat ? 'Hide file format' : 'Show file format',
      onClick: () => {
        onToggleFileFormat();
        focusTrigger();
      }
    }
  ];

  return (
    <div ref={wrapperRef} className="flex" onKeyDownCapture={returnFocusOnEscape}>
      <MenuDropdown items={items} placement="bottom-start" data-testid="show-advanced-options">
        <button type="button" className="btn-advanced flex items-center text-link cursor-pointer" onKeyDown={stopEnterFromConfirmingModal}>
          Options
          <IconCaretDown className="ml-1" size={14} strokeWidth={2} fill="currentColor" aria-hidden="true" />
        </button>
      </MenuDropdown>
    </div>
  );
};

export default ImportOptionsMenu;
