import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconArrowsSort, IconBox, IconSortAscendingLetters, IconSortDescendingLetters } from '@tabler/icons';
import CloseAllIcon from 'components/Icons/CloseAll';
import { sortCollections } from 'providers/ReduxStore/slices/collections/index';
import RemoveCollectionsModal from '../RemoveCollectionsModal';
import StyledWrapper from './StyledWrapper';

const CollectionsHeader = ({ setCreateCollectionModalOpen }) => {
  const dispatch = useDispatch();
  const { collections } = useSelector((state) => state.collections);
  const { collectionSortOrder } = useSelector((state) => state.collections);
  const [collectionsToClose, setCollectionsToClose] = useState([]);

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

  const handleOpenCollection = () => {
    dispatch(openCollection()).catch((err) => {
      console.log(err);
      toast.error('An error occurred while opening the collection');
    });
  };

  let sortIcon;
  if (collectionSortOrder === 'default') {
    sortIcon = <IconArrowsSort size={18} strokeWidth={1.5} />;
  } else if (collectionSortOrder === 'alphabetical') {
    sortIcon = <IconSortAscendingLetters size={18} strokeWidth={1.5} />;
  } else {
    sortIcon = <IconSortDescendingLetters size={18} strokeWidth={1.5} />;
  }

  const selectAllCollectionsToClose = () => {
    setCollectionsToClose(collections.map((c) => c.uid));
  };

  const clearCollectionsToClose = () => {
    setCollectionsToClose([]);
  };

  return (
    <StyledWrapper>
      <div className="collections-badge flex items-center justify-between px-2">
        <div className="flex items-center  py-1 select-none">
          <span className="mr-2">
            <IconBox size={18} strokeWidth={1.5} />
          </span>
          <span>Collections</span>
        </div>
        <div className="flex items-center gap-1">
          <ToolHint text="Create collection" toolhintId="create-collection" place="bottom" delayShow={800}>
            <button onClick={() => setCreateCollectionModalOpen(true)}>
              <IconPlus size={18} strokeWidth={1.5} />
            </button>
          </ToolHint>
          <ToolHint text="Open collection" toolhintId="open-collection" place="bottom" delayShow={800}>
            <button onClick={handleOpenCollection}>
              <IconFolder size={18} strokeWidth={1.5} />
            </button>
          </ToolHint>
        {collections.length >= 1 && (
          <div className="flex items-center collections-header-actions">
            <ToolHint text="Close all collections" toolhintId="close-all-collections" place="bottom" delayShow={800}>
            <button
              className="mr-1 collection-action-button"
              onClick={selectAllCollectionsToClose}
              aria-label="Close all collections"
              title="Close all collections"
              data-testid="close-all-collections-button"
            >
              <CloseAllIcon size={18} strokeWidth={1.5} className="cursor-pointer" />
            </button>
            </ToolHint>
            <ToolHint text="Sort collections" toolhintId="sort-collections" place="bottom" delayShow={800}>
              <button
                className="collection-action-button"
                onClick={() => sortCollectionOrder()}
                aria-label="Sort collections"
                title="Sort collections"
              >
                {sortIcon}
              </button>
            </ToolHint>
            {collectionsToClose.length > 0 && (
              <RemoveCollectionsModal collectionUids={collectionsToClose} onClose={clearCollectionsToClose} />
            )}
          </div>
        )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionsHeader;
