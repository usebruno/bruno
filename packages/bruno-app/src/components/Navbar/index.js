import React, { useState, forwardRef, useRef } from 'react';
import Dropdown from '../Dropdown';
import { IconDots } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const Navbar = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => (menuDropdownTippyRef.current = ref);
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="dropdown-icon cursor-pointer">
        <IconDots size={22} />
      </div>
    );
  });

  return (
    <StyledWrapper className="px-2 py-2 flex items-center">
      <div>
        <span className="ml-2">Collections</span>
        {/* <FontAwesomeIcon className="ml-2" icon={faCaretDown} style={{fontSize: 13}}/> */}
      </div>
      <div className="collection-dropdown flex flex-grow items-center justify-end">
        <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
          <div
            className="dropdown-item"
            onClick={(e) => {
              menuDropdownTippyRef.current.hide();
              setModalOpen(true);
            }}
          >
            Create Collection
          </div>
          <div
            className="dropdown-item"
            onClick={(e) => {
              menuDropdownTippyRef.current.hide();
            }}
          >
            Import Collection
          </div>
          <div
            className="dropdown-item"
            onClick={(e) => {
              menuDropdownTippyRef.current.hide();
            }}
          >
            Settings
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};

export default Navbar;
