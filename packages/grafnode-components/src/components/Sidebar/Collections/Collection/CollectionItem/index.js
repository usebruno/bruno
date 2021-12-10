import React, { useRef, forwardRef } from 'react';
import range from 'lodash/range';
import get from 'lodash/get';
import { IconChevronRight, IconDots } from '@tabler/icons';
import classnames from 'classnames';
import Dropdown from '../../../../Dropdown';

import StyledWrapper from './StyledWrapper';

const CollectionItem = ({item, collectionId, actions, dispatch, activeRequestTabId}) => {
  const dropdownTippyRef = useRef();

  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref}>
        <IconDots size={22} style={{color: 'rgb(110 110 110)'}}/>
      </div>
    );
  });

  const iconClassName = classnames({
    'rotate-90': item.collapsed
  });

  const itemRowClassName = classnames('flex collection-item-name items-center', {
    'item-focused-in-tab': item.id == activeRequestTabId
  });

  const handleClick = (event) => {
    let tippyEl = get(dropdownTippyRef, 'current.reference');
    if(tippyEl && tippyEl.contains && tippyEl.contains(event.target)) {
      return;
    }

    dispatch({
      type: actions.SIDEBAR_COLLECTION_ITEM_CLICK,
      itemId: item.id,
      collectionId: collectionId
    });
  };

  let indents = range(item.depth);

  const onDropdownCreate = (ref) => dropdownTippyRef.current = ref;

  const stopEventPropogation = (event) => {
    event.stopPropagation();
  };

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
                key={i}
                style = {{
                  width: 16,
                  height: '100%',
                  borderRight: 'solid 1px #e1e1e1'
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
              <div>
                <div className="dropdown-item" onClick={(e) => {
                  dropdownTippyRef.current.hide();
                  stopEventPropogation(e);
                  console.log('Clicked');
                }}>
                  Add Request
                </div>
              </div>
            </Dropdown>
          </div>
        </div>
      </div>

      {item.collapsed ? (
        <div>
          {item.items && item.items.length ? item.items.map((i) => {
            return <CollectionItem
              key={i.name}
              item={i}
              collectionId={collectionId}
              actions={actions}
              dispatch={dispatch}
              activeRequestTabId={activeRequestTabId}
            />
          }) : null}
        </div>
      ) : null}
    </StyledWrapper>
  );
};

export default CollectionItem;