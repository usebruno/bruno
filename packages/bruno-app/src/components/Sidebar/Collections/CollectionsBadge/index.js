import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconArrowsSort,
  IconFolders,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconX,
} from '@tabler/icons';
import { sortCollections } from 'providers/ReduxStore/slices/collections/index';
import RemoveCollections from '../RemoveCollections/index';

const CollectionsBadge = () => {
  const dispatch = useDispatch();
  const { collections } = useSelector(state => state.collections);
  const { collectionSortOrder } = useSelector(state => state.collections);
  const sortCollectionOrder = () => {
    let order;
    switch (collectionSortOrder) {
      case 'default':
        order = 'alphabetical';
        break;
      case 'alphabetical':
        order = 'reverseAlphabetical';
        break;
      case 'reverseAlphabetical':
        order = 'default';
        break;
    }
    dispatch(sortCollections({ order }));
  };

  let sortIcon;
  if (collectionSortOrder === 'default') {
    sortIcon = <IconArrowsSort size={18} strokeWidth={1.5} />;
  } else if (collectionSortOrder === 'alphabetical') {
    sortIcon = <IconSortAscendingLetters size={18} strokeWidth={1.5} />;
  } else {
    sortIcon = <IconSortDescendingLetters size={18} strokeWidth={1.5} />;
  }

  const [collectionsToClose, setCollectionsToClose] = useState([]);
  const addAllCollectionsToClose = () => {
    setCollectionsToClose(collections.map(c => c.uid));
  };
  const emptyCollections = () => {
    setCollectionsToClose([]);
  };

  return (
    <div className="items-center mt-2 relative">
      <div className="collections-badge flex items-center justify-between px-2">
        <div className="flex items-center  py-1 select-none">
          <span className="mr-2">
            <IconFolders size={18} strokeWidth={1.5} />
          </span>
          <span>Collections</span>
        </div>
        {collections.length >= 1 && (
          <div className="flex items-center">
            <button onClick={() => sortCollectionOrder()}>
              {sortIcon}
            </button>
            <button className="ml-1" onClick={addAllCollectionsToClose}>
              <IconX
                size={16}
                strokeWidth={1.5}
                className="cursor-pointer"
              />
            </button>
            {collectionsToClose.length > 0 && (
              <RemoveCollections collectionUids={collectionsToClose} onClose={emptyCollections} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsBadge;
