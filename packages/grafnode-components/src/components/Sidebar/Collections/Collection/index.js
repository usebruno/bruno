import React from 'react';
import { IconChevronRight } from '@tabler/icons';
import CollectionItem from './CollectionItem';
import classnames from 'classnames';

import StyledWrapper from './StyledWrapper';

const Collection = ({collection, actions, dispatch, activeRequestTabId}) => {

  const iconClassName = classnames({
    'rotate-90': collection.collapsed
  });

  const handleClick = () => {
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