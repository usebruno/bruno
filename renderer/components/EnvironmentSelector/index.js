import React, { useRef, forwardRef } from 'react';
import Dropdown from 'components/Dropdown';
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconAdjustmentsHorizontal } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const EnvironmentSelector = () => {
  const dropdownTippyRef = useRef();

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="current-enviroment flex items-center justify-center px-3 py-1 select-none">
        No Environment <FontAwesomeIcon className="ml-2 text-gray-500" icon={faCaretDown} style={{fontSize: 13}}/>
      </div>
    );
  });

  const onDropdownCreate = (ref) => dropdownTippyRef.current = ref;

  return (
    <StyledWrapper>
      <div className="flex items-center cursor-pointer environment-selector pr-3">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement='bottom-start'>
          <div className="dropdown-item" onClick={() => {
            dropdownTippyRef.current.hide();
          }}>
            <span>QA1</span>
          </div>
          <div className="dropdown-item" onClick={() => {
            dropdownTippyRef.current.hide();
          }}>
            <span>STG</span>
          </div>
          <div className="dropdown-item" onClick={() => {
            dropdownTippyRef.current.hide();
          }}>
            <span>No Environment</span>
          </div>
          <div className="dropdown-item" style={{borderTop: 'solid 1px #e7e7e7'}} onClick={() => {
            dropdownTippyRef.current.hide();
          }}>
            <div className="pr-2 text-gray-600">
              <IconAdjustmentsHorizontal size={18} strokeWidth={1.5}/>
            </div>
            <span>Settings</span>
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentSelector;
