import React from 'react';
import { IconLayoutGrid } from '@tabler/icons';
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import StyledWrapper from './StyledWrapper';

const Navbar = () => {
  return (
    <StyledWrapper className="px-2 py-2 flex items-center">
      <IconLayoutGrid size={20} strokeWidth={1.5}/>
      <span className="ml-2">My Workspace</span>
      <FontAwesomeIcon className="ml-2" icon={faCaretDown} style={{fontSize: 13}}/>
    </StyledWrapper>
  )
};

export default Navbar;
