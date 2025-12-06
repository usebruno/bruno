import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Collection from './Collection';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import { useMemo } from 'react';

const Collections = ({ showSearch }) => {
  const [searchText, setSearchText] = useState('');
  const { collections } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');

  const workspaceCollections = useMemo(() => {
    if (!activeWorkspace) return [];
    return collections.filter((c) =>
      activeWorkspace.collections?.some((wc) => wc.path === c.pathname)
    );
  }, [activeWorkspace, collections]);

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

      <div className="collections-list flex flex-col flex-1 overflow-hidden hover:overflow-y-auto">
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
