import { forwardRef, useRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { stopEnterFromConfirmingModal } from 'utils/common';

const OptionsButton = forwardRef((props, ref) => (
  <div ref={ref} className="flex items-center text-link cursor-pointer">
    <button className="btn-advanced" type="button" onKeyDown={stopEnterFromConfirmingModal}>
      Options
    </button>
    <IconCaretDown className="ml-1" size={14} strokeWidth={2} fill="currentColor" />
  </div>
));

const ImportOptionsMenu = ({ showFileFormat, onToggleFileFormat }) => {
  const dropdownTippyRef = useRef();

  const onDropdownCreate = (ref) => {
    dropdownTippyRef.current = ref;
  };

  return (
    <div className="flex">
      <Dropdown onCreate={onDropdownCreate} icon={<OptionsButton />} placement="bottom-start">
        <div
          className="dropdown-item"
          data-testid="show-advanced-options-toggle"
          onClick={() => {
            dropdownTippyRef.current.hide();
            onToggleFileFormat();
          }}
        >
          {showFileFormat ? 'Hide file format' : 'Show file format'}
        </div>
      </Dropdown>
    </div>
  );
};

export default ImportOptionsMenu;
