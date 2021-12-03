import React from 'react';
import range from 'lodash/range';
import { IconChevronRight } from '@tabler/icons';
import classnames from 'classnames';

import StyledWrapper from './StyledWrapper';

const CollectionItem = ({item, collectionId, actions, dispatch, activeRequestTabId}) => {

  const iconClassName = classnames({
    'rotate-90': item.collapsed
  });

  const itemRowClassName = classnames('flex collection-item-name items-center', {
    'item-focused-in-tab': item.id == activeRequestTabId
  });

  const handleClick = () => {
    dispatch({
      type: actions.SIDEBAR_COLLECTION_ITEM_CLICK,
      itemId: item.id,
      collectionId: collectionId
    });
  };

  let indents = range(item.depth);

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