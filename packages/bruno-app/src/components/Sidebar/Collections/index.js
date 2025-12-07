import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Collection from './Collection';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import { useMemo } from 'react';
import { normalizePath } from 'utils/common/path';
import { clearCollectionSelection } from 'providers/ReduxStore/slices/collections';

const Collections = ({ showSearch }) => {
  const [searchText, setSearchText] = useState('');
  const { collections } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const dispatch = useDispatch();

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');

  const workspaceCollections = useMemo(() => {
    if (!activeWorkspace) return [];
    return collections.filter((c) =>
      activeWorkspace.collections?.some((wc) => normalizePath(wc.path) === normalizePath(c.pathname))
    );
  }, [activeWorkspace, collections]);

  const handleContainerClick = (e) => {
    if (e.target.classList.contains('collections-list')) {
      dispatch(clearCollectionSelection());
    }
  };

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

      <div
        className="collections-list flex flex-col flex-1 overflow-hidden hover:overflow-y-auto"
        onClick={handleContainerClick}
      >
        {workspaceCollections && workspaceCollections.length
          ? workspaceCollections.map((c, index) => {
              return (
                <Collection
                  searchText={searchText}
                  collection={c}
                  key={c.uid}
                  collectionIndex={index}
                  allCollections={workspaceCollections}
                />
              );
            })
          : null}
      </div>
    </StyledWrapper>
  );
};

export default Collections;
