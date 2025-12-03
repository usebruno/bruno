import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Collection from './Collection';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';

const Collections = ({ showSearch }) => {
  const [searchText, setSearchText] = useState('');
  const { collections } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');

  let workspaceCollections = [];

  if (activeWorkspace?.collections?.length) {
    workspaceCollections = activeWorkspace.collections.map((wc) => {
      return collections.find((c) => c.pathname === wc.path);
    }).filter(Boolean);
  }


  if (!workspaceCollections || !workspaceCollections.length) {
    return (
      <StyledWrapper>
        <CreateOrOpenCollection />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper data-testid="collections">
      {createCollectionModalOpen ? (
        <CreateCollection
          onClose={() => setCreateCollectionModalOpen(false)}
        />
      ) : null}

      {showSearch && (
        <CollectionSearch searchText={searchText} setSearchText={setSearchText} />
      )}

      <div className={`mt-4 flex flex-col overflow-hidden hover:overflow-y-auto absolute ${showSearch ? 'top-16' : 'top-8'} bottom-0 left-0 right-0`}>
        {workspaceCollections && workspaceCollections.length
          ? workspaceCollections.map((c) => {
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
