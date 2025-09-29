import {
  IconArrowsSort,
  IconFolders,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconX,
} from '@tabler/icons';
import { sortCollections } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch, useSelector } from 'react-redux';

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
            <button className="me-1" onClick={() => sortCollectionOrder()}>
              {sortIcon}
            </button>
            <button
              onClick={() => {
                alert('toto');
              }}
            >
              <IconX
                size={16}
                strokeWidth={1.5}
                className="cursor-pointer"
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsBadge;
