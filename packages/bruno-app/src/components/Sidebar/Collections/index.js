import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { IconSearch, IconFolders, IconSortAscendingLetters } from '@tabler/icons';
import Collection from '../Collections/Collection';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch } from 'react-redux';
import { sortCollection } from 'providers/ReduxStore/slices/collections/actions';
const CollectionsBadge = () => {
  const dispatch = useDispatch()
  return (
    <div className="items-center mt-2 relative">
      <div className='collections-badge flex items-center justify-between pr-2' >
        <div className="flex items-center pl-2 pr-2 py-1 select-none">
          <span className="mr-2">
            <IconFolders size={18} strokeWidth={1.5} />
          </span>
          <span>Collections</span>
        </div>
        <button onClick={() => dispatch(sortCollection())} >
          <IconSortAscendingLetters size={18} strokeWidth={1.5} />
        </button>
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
          id="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className="block w-full pl-7 py-1 sm:text-sm"
          placeholder="search"
          onChange={(e) => setSearchText(e.target.value.toLowerCase())}
        />
      </div>

      <div className="mt-4 flex flex-col overflow-y-auto absolute top-32 bottom-10 left-0 right-0">
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
