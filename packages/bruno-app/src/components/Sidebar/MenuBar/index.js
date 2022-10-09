import React from 'react';
import Link from 'next/link';
import { IconCode, IconFiles, IconUser, IconUsers, IconSettings, IconBuilding, IconChevronsLeft} from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { toggleLeftMenuBar } from 'providers/ReduxStore/slices/app'
import StyledWrapper from './StyledWrapper';

const MenuBar = () => {
  const leftMenuBarOpen = useSelector((state) => state.app.leftMenuBarOpen);
  const dispatch = useDispatch();

  return (
    <StyledWrapper className="h-full flex flex-col">
      <div className="flex flex-col">
        <div className="menu-item active">
          <Link href="/">
            <IconCode size={28} strokeWidth={1.5}/>
          </Link>
        </div>
        <div className="menu-item">
          <IconFiles size={28} strokeWidth={1.5}/>
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
        <div className="menu-item" onClick={() => dispatch(toggleLeftMenuBar())}>
          <IconChevronsLeft size={28} strokeWidth={1.5}/>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default MenuBar;