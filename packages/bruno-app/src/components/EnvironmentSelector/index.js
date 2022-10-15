import React, { useRef, forwardRef, useState } from 'react';
import Dropdown from 'components/Dropdown';
import { IconAdjustmentsHorizontal, IconCaretDown } from '@tabler/icons';
import EnvironmentSettings from "./EnvironmentSettings";
import StyledWrapper from './StyledWrapper';

const EnvironmentSelector = () => {
  const dropdownTippyRef = useRef();
  const [openSettingsModal, setOpenSettingsModal] = useState(false);

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="current-enviroment flex items-center justify-center pl-3 pr-2 py-1 select-none">
        No Environment
        <IconCaretDown className="caret" size={14} strokeWidth={2}/>
      </div>
    );
  });

  const onDropdownCreate = (ref) => dropdownTippyRef.current = ref;

  return (
    <StyledWrapper>
      <div className="flex items-center cursor-pointer environment-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement='bottom-end'>
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
          <div className="dropdown-item" style={{borderTop: 'solid 1px #e7e7e7'}} onClick={() => setOpenSettingsModal(true)}>
            <div className="pr-2 text-gray-600">
              <IconAdjustmentsHorizontal size={18} strokeWidth={1.5}/>
            </div>
            <span>Settings</span>
          </div>
        </Dropdown>
      </div>
      {openSettingsModal && <EnvironmentSettings onClose={() => setOpenSettingsModal(false)}/>}
    </StyledWrapper>
  );
};

export default EnvironmentSelector;
