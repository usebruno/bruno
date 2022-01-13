import React, { useState, forwardRef, useRef } from 'react';
import Collections from './Collections';
import CreateCollection from './CreateCollection';
import Navbar from '../Navbar';
import Dropdown from '../Dropdown';
import { IconBox, IconSearch, IconDots } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const Sidebar = ({collections, actions, dispatch, activeRequestTabId}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => menuDropdownTippyRef.current = ref;
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="dropdown-icon cursor-pointer">
        <IconDots size={22}/>
      </div>
    );
  });

  const handleCancel = () => {
    setModalOpen(false);
  };

  const handleConfirm = () => {
    setModalOpen(false);
  };

  return (
    <StyledWrapper>
      {modalOpen ? (
        <CreateCollection
          handleCancel={handleCancel}
          handleConfirm={handleConfirm}
          actions={actions}
          dispatch={dispatch}
        />
      ) : null}

      <Navbar />

      <div className="mt-4 px-2 py-1 flex collection-title">
        <IconBox size={22} strokeWidth={1.5}/>
        <span className="ml-2">Collections</span>
        <div className="collection-dropdown flex flex-grow items-center justify-end">
          <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement='bottom-start'>
            <div>
              <div className="dropdown-item" onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setModalOpen(true);
              }}>
                Create Collection
              </div>
            </div>
            <div>
              <div className="dropdown-item" onClick={(e) => {
                menuDropdownTippyRef.current.hide();
              }}>
                Settings
              </div>
            </div>
          </Dropdown>
        </div>
      </div>

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

      <Collections
        collections={collections}
        actions={actions}
        dispatch={dispatch}
        activeRequestTabId={activeRequestTabId}
      />
    </StyledWrapper>
  );
};

export default Sidebar;