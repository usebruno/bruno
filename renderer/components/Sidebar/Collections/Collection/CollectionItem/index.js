import React, { useRef, forwardRef } from 'react';
import range from 'lodash/range';
import get from 'lodash/get';
import actions from 'providers/Store/actions'
import { useStore } from 'providers/Store';
import { IconChevronRight, IconDots } from '@tabler/icons';
import classnames from 'classnames';
import Dropdown from 'components/Dropdown';

import StyledWrapper from './StyledWrapper';

const CollectionItem = ({item, collectionUid}) => {
  const [store, storeDispatch] = useStore();

  const {
    activeRequestTabUid
  } = store;

  const dropdownTippyRef = useRef();
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref}>
        <IconDots size={22}/>
      </div>
    );
  });

  const iconClassName = classnames({
    'rotate-90': item.collapsed
  });

  const itemRowClassName = classnames('flex collection-item-name items-center', {
    'item-focused-in-tab': item.uid == activeRequestTabUid
  });

  const handleClick = (event) => {
    let tippyEl = get(dropdownTippyRef, 'current.reference');
    if(tippyEl && tippyEl.contains && tippyEl.contains(event.target)) {
      return;
    }

    storeDispatch({
      type: actions.SIDEBAR_COLLECTION_ITEM_CLICK,
      itemUid: item.uid,
      collectionUid: collectionUid
    });
  };

  const addRequest = () => {
    storeDispatch({
      type: actions.ADD_REQUEST,
      itemUid: item.uid,
      collectionUid: collectionUid
    });
  };

  let indents = range(item.depth);
  const onDropdownCreate = (ref) => dropdownTippyRef.current = ref;

  return (
    <StyledWrapper className="flex flex-col">
      <div
        className={itemRowClassName}
        onClick={handleClick}
      >
        <div className="flex items-center h-full w-full">
          {indents && indents.length ? indents.map((i) => {
            return (
              <div
                className="indent-block"
                key={i}
                style = {{
                  width: 16,
                  height: '100%'
                }}
              >
                &nbsp;{/* Indent */}
              </div>
            );
          }) : null}
          <div
            className="flex items-center"
            style = {{
              paddingLeft: 8
            }}
          >
            <div style={{width:16}}>
              {item.items && item.items.length ? (
                <IconChevronRight size={16} strokeWidth={2} className={iconClassName} style={{color: 'rgb(160 160 160)'}}/>
              ) : null}
            </div>
            
            <span className="ml-1">{item.name}</span>
          </div>
          <div className="menu-icon pr-2">
            <Dropdown onCreate={onDropdownCreate} icon={<MenuIcon />} placement='bottom-start'>
              <div className="dropdown-item" onClick={(e) => {
                dropdownTippyRef.current.hide();
                addRequest();
              }}>
                New Request
              </div>
              <div className="dropdown-item" onClick={(e) => {
                dropdownTippyRef.current.hide();
              }}>
                New Folder
              </div>
              <div className="dropdown-item" onClick={(e) => {
                dropdownTippyRef.current.hide();
              }}>
                Rename
              </div>
              <div className="dropdown-item" onClick={(e) => {
                dropdownTippyRef.current.hide();
              }}>
                Delete
              </div>
            </Dropdown>
          </div>
        </div>
      </div>

      {item.collapsed ? (
        <div>
          {item.items && item.items.length ? item.items.map((i) => {
            return <CollectionItem
              key={i.uid}
              item={i}
              collectionUid={collectionUid}
            />
          }) : null}
        </div>
      ) : null}
    </StyledWrapper>
  );
};

export default CollectionItem;