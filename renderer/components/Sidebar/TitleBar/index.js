import React, { useState, forwardRef, useRef } from 'react';
import Dropdown from '../../Dropdown';
import CreateCollection from '../CreateCollection';
import { IconDots } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const Navbar = ({dispatch, actions}) => {
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

  const handleConfirm = (values) => {
    dispatch({
      name: values.collectionName,
      type: actions.COLLECTION_CREATE
    });
    setModalOpen(false);
  };

  return (
    <StyledWrapper className="px-2 py-2 flex items-center">
      {modalOpen ? (
        <CreateCollection
          handleCancel={handleCancel}
          handleConfirm={handleConfirm}
          actions={actions}
          dispatch={dispatch}
        />
      ) : null}

      <div>
        <span className="ml-2">Collections</span>
      </div>
      <div className="collection-dropdown flex flex-grow items-center justify-end">
        <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement='bottom-start'>
          <div className="dropdown-item" onClick={(e) => {
            menuDropdownTippyRef.current.hide();
            setModalOpen(true);
          }}>
            Create Collection
          </div>
          <div className="dropdown-item" onClick={(e) => {
            menuDropdownTippyRef.current.hide();
          }}>
            Import Collection
          </div>
          <div className="dropdown-item" onClick={(e) => {
            menuDropdownTippyRef.current.hide();
          }}>
            Settings
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  )
};

export default Navbar;
