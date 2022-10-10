import React, { useState, forwardRef, useRef } from 'react';
import toast from 'react-hot-toast';
import Dropdown from 'components/Dropdown';
import Bruno from 'components/Bruno';
import { useDispatch } from 'react-redux';
import { createCollection } from 'providers/ReduxStore/slices/collections/actions';
import { showHomePage } from 'providers/ReduxStore/slices/app';
import { IconDots } from '@tabler/icons';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';

const TitleBar = () => {
  const [modalOpen, setModalOpen] = useState(false);
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
  const handleTitleClick = () => dispatch(showHomePage());

  const handleConfirm = (values) => {
    setModalOpen(false);
    dispatch(createCollection(values.collectionName))
      .then(() => {
        toast.success("Collection created");
      })
      .catch(() => toast.error("An error occured while creating the collection"));
  };

  return (
    <StyledWrapper className="px-2 py-2">
      {modalOpen ? (
        <CreateCollection
          handleCancel={handleCancel}
          handleConfirm={handleConfirm}
        />
      ) : null}

      <div className="flex items-center">
        <div className="flex items-center cursor-pointer" onClick={handleTitleClick}>
          <Bruno width={30} />
        </div>
        <div
          onClick={handleTitleClick}
          className=" flex items-center font-medium select-none cursor-pointer"
          style={{fontSize: 14, paddingLeft: 6, position: 'relative', top: -1}}
        >
          bruno
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
              Add Collection to Workspace
            </div>
          </Dropdown>
        </div>
      </div>
    </StyledWrapper>
  )
};

export default TitleBar;
