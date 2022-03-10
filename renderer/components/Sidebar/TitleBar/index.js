import React, { useState, forwardRef, useRef } from 'react';
import {nanoid} from 'nanoid';
import Toast from 'components/Toast';
import Dropdown from 'components/Dropdown';
import { saveCollectionToIdb } from 'providers/Store/idb';
import { useStore } from 'providers/Store';
import { IconDots } from '@tabler/icons';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';

const TitleBar = ({dispatch, actions}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [store, storeDispatch] = useStore();
  const [showToast, setShowToast] = useState({show: false});

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
    // dispatch({
    //   name: values.collectionName,
    //   type: actions.COLLECTION_CREATE
    // });
    setModalOpen(false);
    console.log(store.idbConnection);
    if(!store.idbConnection) {
      setShowToast({
        show: true,
        type: 'error',
        text: 'IndexedDB Error: idb connection is null'
      });
      return;
    }

    const collectionUid = nanoid();
    const newCollection = {
      uid: collectionUid,
      base: null,
      current: {
        id: collectionUid,
        name: values.collectionName,
        items: []
      },
      requestSync: true
    };

    saveCollectionToIdb(store.idbConnection, newCollection)
      .then(() => console.log('Collection created'))
      .catch((err) => {
        setShowToast({
          show: true,
          type: 'error',
          text: 'IndexedDB Error: Unable to save collection'
        });
      });
  };

  return (
    <StyledWrapper className="px-2 py-2 flex items-center">
      {showToast.show && <Toast text={showToast.text} type={showToast.type}  duration={showToast.duration} handleClose={handleCloseToast}/>}
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

export default TitleBar;
