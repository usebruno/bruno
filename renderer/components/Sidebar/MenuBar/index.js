import React from 'react';
import Link from 'next/link';
import { IconCode, IconStack, IconGitPullRequest, IconUser, IconUsers, IconSettings,IconBuilding } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const MenuBar = () => {
  return (
    <StyledWrapper className="h-full flex flex-col">
      <div className="flex flex-col">
        <div className="menu-item active">
          <Link href="/">
            <IconCode size={28} strokeWidth={1.5}/>
          </Link>
        </div>
        <div className="menu-item">
          <IconStack size={28} strokeWidth={1.5}/>
        </div>
        <div className="menu-item">
          <IconGitPullRequest size={28} strokeWidth={1.5}/>
        </div>
        <div className="menu-item">
          <IconUsers size={28} strokeWidth={1.5}/>
        </div>
      </div>
      <div className="flex flex-col flex-grow justify-end">
        {/* Teams Icon */}
        {/* <div className="menu-item">
          <IconBuilding size={28} strokeWidth={1.5}/>
        </div> */}
        <div className="menu-item">
          <Link href="/login">
            <IconUser size={28} strokeWidth={1.5}/>
          </Link>
        </div>
        <div className="menu-item">
          <IconSettings size={28} strokeWidth={1.5}/>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default MenuBar;