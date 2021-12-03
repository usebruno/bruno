import React from 'react';
import { IconBox } from '@tabler/icons';
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import StyledWrapper from './StyledWrapper';

const Navbar = () => {
  return (
    <StyledWrapper className="px-3 py-2 flex items-center bg-gray-200 justify-center">
      <IconBox size={22} strokeWidth={1.5}/>
      <span className="ml-2">My Workspace</span>
      <FontAwesomeIcon className="ml-2 text-gray-200" icon={faCaretDown} style={{fontSize: 13}}/>
    </StyledWrapper>
  )
};

export default Navbar;
