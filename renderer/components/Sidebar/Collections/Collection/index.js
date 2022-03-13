import React, { forwardRef, useRef } from 'react';
import { IconChevronRight, IconDots } from '@tabler/icons';
import CollectionItem from './CollectionItem';
import Dropdown from '../../../Dropdown';
import get from 'lodash/get';
import classnames from 'classnames';

import StyledWrapper from './StyledWrapper';

const Collection = ({collection, actions, dispatch, activeRequestTabId}) => {
  const envDropdownTippyRef = useRef();

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
    let envTippyEl = get(envDropdownTippyRef, 'current.reference');
    if(envTippyEl && envTippyEl.contains && envTippyEl.contains(event.target)) {
      return;
    }

    dispatch({
      type: actions.SIDEBAR_COLLECTION_CLICK,
      id: collection.id
    });
  };

  return (
    <StyledWrapper className="flex flex-col">
      <div className="flex py-1 collection-name items-center" onClick={handleClick}>
        <IconChevronRight size={16} strokeWidth={2} className={iconClassName} style={{width:16, color: 'rgb(160 160 160)'}}/>
        <span className="ml-1">{collection.name}</span>
        <div className="collection-actions">
          <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement='bottom-start'>
            <div>
              <div className="dropdown-item" onClick={(e) => {
                menuDropdownTippyRef.current.hide();
              }}>
                Add Request
              </div>
            </div>
            <div>
              <div className="dropdown-item" onClick={(e) => {
                menuDropdownTippyRef.current.hide();
              }}>
                Add Folder
              </div>
            </div>
          </Dropdown>
        </div>
      </div>

      <div>
        {collection.collapsed ? (
          <div>
            {collection.items && collection.items.length ? collection.items.map((i) => {
              return <CollectionItem
                key={i.name}
                item={i}
                collectionId={collection.id}
                actions={actions}
                dispatch={dispatch}
                activeRequestTabId={activeRequestTabId}
              />
            }) : null}
          </div>
        ) : null}
      </div>
    </StyledWrapper>
  );
};

export default Collection;