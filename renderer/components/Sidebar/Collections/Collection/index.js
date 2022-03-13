import React, { useState, forwardRef, useRef } from 'react';
import get from 'lodash/get';
import classnames from 'classnames';
import { IconChevronRight, IconDots } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import actions from 'providers/Store/actions'
import { useStore } from 'providers/Store';
import NewFolder from 'components/Sidebar/NewFolder';
import CollectionItem from './CollectionItem';

import StyledWrapper from './StyledWrapper';

const Collection = ({collection}) => {
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [store, storeDispatch] = useStore();

  const {
    activeRequestTabId
  } = store;

  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => menuDropdownTippyRef.current = ref;
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref}>
        <IconDots size={22}/>
      </div>
    );
  });

  const iconClassName = classnames({
    'rotate-90': collection.collapsed
  });

  const handleClick = (event) => {
    let tippyEl = get(menuDropdownTippyRef, 'current.reference');
    if(tippyEl && tippyEl.contains && tippyEl.contains(event.target)) {
      return;
    }

    if(event && event.target && event.target.className === 'dropdown-item') {
      return;
    }

    storeDispatch({
      type: actions.SIDEBAR_COLLECTION_CLICK,
      collectionUid: collection.uid
    });
  };

  const hideAddFolderModal = () => setShowNewFolderModal(false);
  const collectionItems = get(collection, 'current.items');

  return (
    <StyledWrapper className="flex flex-col">
      {showNewFolderModal && (
        <NewFolder
          collectionUid={collection.uid}
          handleCancel={hideAddFolderModal}
          handleClose={hideAddFolderModal}
        />
      )}
      <div className="flex py-1 collection-name items-center" onClick={handleClick}>
        <IconChevronRight size={16} strokeWidth={2} className={iconClassName} style={{width:16, color: 'rgb(160 160 160)'}}/>
        <span className="ml-1">{collection.current.name}</span>
        <div className="collection-actions">
          <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement='bottom-start'>
            <div className="dropdown-item" onClick={(e) => {
              menuDropdownTippyRef.current.hide();
            }}>
              New Request
            </div>
            <div className="dropdown-item" onClick={(e) => {
              menuDropdownTippyRef.current.hide();
              setShowNewFolderModal(true)
            }}>
              New Folder
            </div>
          </Dropdown>
        </div>
      </div>

      <div>
        {collection.collapsed ? (
          <div>
            {collectionItems && collectionItems.length ? collectionItems.map((i) => {
              return <CollectionItem
                key={i.uid}
                item={i}
                collectionId={collection.id}
              />
            }) : null}
          </div>
        ) : null}
      </div>
    </StyledWrapper>
  );
};

export default Collection;