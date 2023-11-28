import React, { useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from '@components/Dropdown';
import StyledWrapper from './StyledWrapper';

const HttpMethodSelector = ({ method, onMethodSelect }) => {
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex w-full items-center pl-3 py-1 select-none uppercase">
        <div className="flex-grow font-medium" id="create-new-request-method">
          {method}
        </div>
        <div>
          <IconCaretDown className="caret ml-2 mr-2" size={14} strokeWidth={2} />
        </div>
      </div>
    );
  });

  const handleMethodSelect = (verb) => onMethodSelect(verb);

  const Verb = ({ verb }) => {
    return (
      <div
        className="dropdown-item"
        onClick={() => {
          dropdownTippyRef.current.hide();
          handleMethodSelect(verb);
        }}
      >
        {verb}
      </div>
    );
  };

  return (
    <StyledWrapper>
      <div className="flex items-center cursor-pointer method-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-start">
          <Verb verb="GET" />
          <Verb verb="POST" />
          <Verb verb="PUT" />
          <Verb verb="DELETE" />
          <Verb verb="PATCH" />
          <Verb verb="OPTIONS" />
          <Verb verb="HEAD" />
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default HttpMethodSelector;
