import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconSearch,
  IconFolders,
  IconArrowsSort,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconX
} from '@tabler/icons';
import Collection from '../Collections/Collection';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { sortCollections } from 'providers/ReduxStore/slices/collections/actions';

// todo: move this to a separate folder
// the coding convention is to keep all the components in a folder named after the component
const CollectionsBadge = () => {
  const dispatch = useDispatch();
  const { collections } = useSelector((state) => state.collections);
  const { collectionSortOrder } = useSelector((state) => state.collections);
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
          <button onClick={() => sortCollectionOrder()}>
            {collectionSortOrder == 'default' ? (
              <IconArrowsSort size={18} strokeWidth={1.5} />
            ) : collectionSortOrder == 'alphabetical' ? (
              <IconSortAscendingLetters size={18} strokeWidth={1.5} />
            ) : (
              <IconSortDescendingLetters size={18} strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const Collections = () => {
  const [searchText, setSearchText] = useState('');
  const { collections } = useSelector((state) => state.collections);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);

  if (!collections || !collections.length) {
    return (
      <StyledWrapper>
        <CollectionsBadge />
        <CreateOrOpenCollection />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      {createCollectionModalOpen ? <CreateCollection onClose={() => setCreateCollectionModalOpen(false)} /> : null}

      <CollectionsBadge />

      <div className="mt-4 relative collection-filter px-2">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">
            <IconSearch size={16} strokeWidth={1.5} />
          </span>
        </div>
        <input
          type="text"
          name="search"
          placeholder="search"
          id="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className="block w-full pl-7 py-1 sm:text-sm"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value.toLowerCase())}
        />
        {searchText !== '' && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <span
              className="close-icon"
              onClick={() => {
                setSearchText('');
              }}
            >
              <IconX size={16} strokeWidth={1.5} className="cursor-pointer" />
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col overflow-hidden hover:overflow-y-auto absolute top-32 bottom-10 left-0 right-0">
        {collections && collections.length
          ? collections.map((c) => {
              return (
                <DndProvider backend={HTML5Backend} key={c.uid}>
                  <Collection searchText={searchText} collection={c} key={c.uid} />
                </DndProvider>
              );
            })
          : null}
      </div>
    </StyledWrapper>
  );
};

export default Collections;
