import React, { useState, forwardRef, useRef } from 'react';
import Toast from 'components/Toast';
import Dropdown from 'components/Dropdown';
import { useDispatch } from 'react-redux';
import { createCollection } from 'providers/ReduxStore/slices/collections';
import { IconDots } from '@tabler/icons';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';

const TitleBar = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [showToast, setShowToast] = useState({show: false});
  const dispatch = useDispatch();

  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => menuDropdownTippyRef.current = ref;
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="dropdown-icon cursor-pointer">
        <IconDots size={22}/>
      </div>
    );
  });

  const handleCancel = () => setModalOpen(false);
  const handleCloseToast = () => setShowToast({show: false});

  const handleConfirm = (values) => {
    setModalOpen(false);
    dispatch(createCollection(values.collectionName))
  };

  return (
    <StyledWrapper className="px-2 py-2 flex items-center">
      {showToast.show && <Toast text={showToast.text} type={showToast.type}  duration={showToast.duration} handleClose={handleCloseToast}/>}
      {modalOpen ? (
        <CreateCollection
          handleCancel={handleCancel}
          handleConfirm={handleConfirm}
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

export default TitleBar;
