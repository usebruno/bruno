import React from 'react';
import actions from 'providers/Store/actions';
import { useStore } from 'providers/Store';
import Collections from './Collections';
import MenuBar from './MenuBar';
import TitleBar from './TitleBar';
import { IconSearch, IconChevronsRight} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const Sidebar = () => {
  const [store, storeDispatch] = useStore();
  const {
    asideWidth,
    leftMenuBarOpen
  } = store;

  const showMenuBar = () => {
    storeDispatch({
      type: actions.TOGGLE_LEFT_MENUBAR
    })
  };

  return (
    <StyledWrapper style={{width: `${asideWidth}px`, minWidth: `${asideWidth}px`}}>
      <div className="flex flex-row h-full">
        {leftMenuBarOpen && <MenuBar />}

        <div className="flex flex-col flex-grow">
          <div className="flex flex-col flex-grow">
            <TitleBar />

            <div className="mt-4 relative collection-filter px-2">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">
                  <IconSearch size={16} strokeWidth={1.5}/>
                </span>
              </div>
              <input
                type="text"
                name="price"
                id="price"
                className="block w-full pl-7 py-1 sm:text-sm"
                placeholder="search"
              />
            </div>

            <Collections />
          </div>
          <div
            onClick={showMenuBar}
            className="flex flex-col px-1 py-2 cursor-pointer text-gray-500 hover:text-gray-700"
          >
            {!leftMenuBarOpen && <IconChevronsRight size={24} strokeWidth={1.5}/>}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Sidebar;