import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { IconCode, IconFiles, IconUser, IconUsers, IconSettings, IconChevronsLeft} from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { toggleLeftMenuBar } from 'providers/ReduxStore/slices/app'
import StyledWrapper from './StyledWrapper';

const MenuBar = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const getClassName = (menu) => {
    return router.pathname === menu ? "active menu-item": "menu-item";
  };

  return (
    <StyledWrapper className="h-full flex flex-col">
      <div className="flex flex-col">
        <Link href="/">
          <div className={getClassName('/')}>
            <IconCode size={28} strokeWidth={1.5}/>
          </div>
        </Link>
        <Link href="/collections">
          <div className={getClassName('/collections')}>
            <IconFiles size={28} strokeWidth={1.5}/>
          </div>
        </Link>
        <div className="menu-item">
          <IconUsers size={28} strokeWidth={1.5}/>
        </div>
      </div>
      <div className="flex flex-col flex-grow justify-end">
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