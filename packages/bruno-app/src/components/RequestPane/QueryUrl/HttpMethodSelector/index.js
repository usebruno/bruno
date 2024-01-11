import React, { useRef, forwardRef } from 'react';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';
import { DropdownItem } from 'components/Dropdown/DropdownItem/dropdown_item';
import { ChevronDown } from 'lucide-react';

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
          <ChevronDown className="caret ml-2 mr-2" size={16} />
        </div>
      </div>
    );
  });

  const handleMethodSelect = (verb) => onMethodSelect(verb);

  const Verb = ({ verb }) => {
    return (
      <DropdownItem
        onClick={() => {
          dropdownTippyRef.current.hide();
          handleMethodSelect(verb);
        }}
        active={method === verb}
      >
        {verb}
      </DropdownItem>
    );
  };

  return (
    <StyledWrapper>
      <div className="flex items-center cursor-pointer method-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-start">
          <div className="flex flex-col px-1">
            <Verb verb="GET" />
            <Verb verb="POST" />
            <Verb verb="PUT" />
            <Verb verb="DELETE" />
            <Verb verb="PATCH" />
            <Verb verb="OPTIONS" />
            <Verb verb="HEAD" />
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default HttpMethodSelector;
