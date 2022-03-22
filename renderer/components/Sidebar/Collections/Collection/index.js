import React, { useState, forwardRef, useRef } from 'react';
import classnames from 'classnames';
import { IconChevronRight, IconDots } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { collectionClicked, removeCollection } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import NewRequest from 'components/Sidebar/NewRequest';
import NewFolder from 'components/Sidebar/NewFolder';
import CollectionItem from './CollectionItem';

import StyledWrapper from './StyledWrapper';

const Collection = ({collection}) => {
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const dispatch = useDispatch();

  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => menuDropdownTippyRef.current = ref;
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="pr-2">
        <IconDots size={22}/>
      </div>
    );
  });

  const iconClassName = classnames({
    'rotate-90': !collection.collapsed
  });

  const handleClick = (event) => {
    dispatch(collectionClicked(collection.uid));
  };

  return (
    <StyledWrapper className="flex flex-col">
      {showNewRequestModal && <NewRequest collection={collection} onClose={() => setShowNewRequestModal(false)}/>}
      {showNewFolderModal && <NewFolder collection={collection} onClose={() => setShowNewFolderModal(false)}/>}
      <div className="flex py-1 collection-name items-center">
        <div className="flex flex-grow items-center" onClick={handleClick}>
          <IconChevronRight size={16} strokeWidth={2} className={iconClassName} style={{width:16, color: 'rgb(160 160 160)'}}/>
          <div className="ml-1">{collection.name}</div>
        </div>
        <div className='collection-actions'>
          <Dropdown
            onCreate={onMenuDropdownCreate}
            icon={<MenuIcon />}
            placement='bottom-start'
          >
            <div className="dropdown-item" onClick={(e) => {
              menuDropdownTippyRef.current.hide();
              setShowNewRequestModal(true)
            }}>
              New Request
            </div>
            <div className="dropdown-item" onClick={(e) => {
              menuDropdownTippyRef.current.hide();
              setShowNewFolderModal(true)
            }}>
              New Folder
            </div>
            <div className="dropdown-item" onClick={(e) => {
              dispatch(removeCollection(collection.uid));
              menuDropdownTippyRef.current.hide();
            }}>
              Remove
            </div>
          </Dropdown>
        </div>
      </div>

      <div>
        {!collection.collapsed ? (
          <div>
            {collection.items && collection.items.length ? collection.items.map((i) => {
              return <CollectionItem
                key={i.uid}
                item={i}
                collection={collection}
              />
            }) : null}
          </div>
        ) : null}
      </div>
    </StyledWrapper>
  );
};

export default Collection;