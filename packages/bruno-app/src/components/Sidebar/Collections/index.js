import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { IconSearch, IconX } from '@tabler/icons';
import Collection from '../Collections/Collection';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';

const Collections = ({ showSearch }) => {
  const [searchText, setSearchText] = useState('');
  const { collections } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');

  let allCollections = [];

  if (!activeWorkspace || activeWorkspace.type === 'default') {
    if (activeWorkspace && activeWorkspace.collections && activeWorkspace.collections.length > 0) {
      allCollections = activeWorkspace.collections.map((wc) => {
        const loadedCollection = collections.find((c) => c.pathname === wc.path);
        return loadedCollection;
      }).filter(Boolean);
    } else {
      allCollections = [];
    }
  } else {
    if (activeWorkspace.collections && activeWorkspace.collections.length > 0) {
      allCollections = activeWorkspace.collections.map((wc) => {
        const loadedCollection = collections.find((c) => c.pathname === wc.path);
        return loadedCollection;
      }).filter(Boolean);
    }
  }

  if (!allCollections || !allCollections.length) {
    return (
      <StyledWrapper>
        <CreateOrOpenCollection />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      {createCollectionModalOpen ? (
        <CreateCollection
          onClose={() => setCreateCollectionModalOpen(false)}
          workspaceUid={activeWorkspace?.uid}
          defaultLocation={activeWorkspace?.pathname ? `${activeWorkspace.pathname}/collections` : ''}
          hideLocationInput={!!activeWorkspace?.pathname}
        />
      ) : null}

      {showSearch && (
        <div className="relative collection-filter px-2">
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
            className="block w-full pl-7 pr-8 py-1 sm:text-sm"
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
      )}

      <div className={`mt-4 flex flex-col overflow-hidden hover:overflow-y-auto absolute ${showSearch ? 'top-16' : 'top-8'} bottom-0 left-0 right-0`}>
        {allCollections && allCollections.length
          ? allCollections.map((c) => {
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
