import {
  IconSearch,
  IconX,
} from '@tabler/icons';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import CreateCollection from '../CreateCollection';
import Collection from './Collection';
import CollectionsBadge from './CollectionsBadge/index';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import StyledWrapper from './StyledWrapper';

const Collections = () => {
  const [searchText, setSearchText] = useState('');
  const { collections } = useSelector((state) => state.collections);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  if (!collections || !collections.length) {
    return (
      <StyledWrapper onMouseEnter={() => setIsSidebarHovered(true)} onMouseLeave={() => setIsSidebarHovered(false)}>
        <CollectionsBadge isSidebarHovered={isSidebarHovered} />
        <CreateOrOpenCollection />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper onMouseEnter={() => setIsSidebarHovered(true)} onMouseLeave={() => setIsSidebarHovered(false)}>
      {createCollectionModalOpen ? <CreateCollection onClose={() => setCreateCollectionModalOpen(false)} /> : null}

      <CollectionsBadge isSidebarHovered={isSidebarHovered} />

      <div className="mt-4 relative collection-filter px-2">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">
            <IconSearch size={16} strokeWidth={1.5} />
          </span>
        </div>
        <input
          type="text"
          name="search"
          placeholder="Search requests …"
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

      <div className="mt-4 flex flex-col overflow-hidden hover:overflow-y-auto absolute top-32 bottom-0 left-0 right-0">
        {collections && collections.length
          ? collections.map((c) => {
              return (
                <Collection searchText={searchText} collection={c} key={c.uid} />
              );
            })
          : null}
      </div>
    </StyledWrapper>
  );
};

export default Collections;
