import React, { useRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';

const TabPanelSelector = ({ value, onChange, options }) => {
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const Icon = React.forwardRef((_, ref) => {
    const selectedOption = options.find((option) => option.value === value);
    const displayText = selectedOption ? selectedOption.label : 'Select';

    return (
      <div ref={ref} className="flex w-full items-center px-3 py-1 select-none">
        <div className="flex-grow font-medium">{displayText}</div>
        <div>
          <IconCaretDown className="caret ml-2" size={14} strokeWidth={2} />
        </div>
      </div>
    );
  });

  const Option = ({ option }) => {
    return (
      <div
        className="dropdown-item"
        onClick={() => {
          dropdownTippyRef.current.hide();
          onChange(option.value);
        }}
      >
        {option.label}
      </div>
    );
  };

  return (
    <StyledWrapper>
      <div className="flex items-center cursor-pointer tab-panel-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-start">
          {options.map((option, index) => (
            <Option key={index} option={option} />
          ))}
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};

export default TabPanelSelector;
