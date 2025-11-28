import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconArrowsSort, IconFolders, IconSortAscendingLetters, IconSortDescendingLetters, IconCloud } from '@tabler/icons';
import CloseAllIcon from 'components/Icons/CloseAll';
import { sortCollections } from 'providers/ReduxStore/slices/collections/index';
import RemoveCollectionsModal from '../RemoveCollectionsModal';
import SshConnectionDialog from 'components/Sidebar/SshConnectionDialog';
import RemoteFileBrowser from 'components/Sidebar/RemoteFileBrowser';
import StyledWrapper from './StyledWrapper';

const CollectionsHeader = () => {
  const dispatch = useDispatch();
  const { collections } = useSelector((state) => state.collections);
  const { collectionSortOrder } = useSelector((state) => state.collections);
  const [collectionsToClose, setCollectionsToClose] = useState([]);
  const [sshConnectionDialogOpen, setSshConnectionDialogOpen] = useState(false);
  const [remoteFileBrowserOpen, setRemoteFileBrowserOpen] = useState(false);
  const [currentConnectionId, setCurrentConnectionId] = useState(null);

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

  const handleSshConnect = (connectionId, config) => {
    setCurrentConnectionId(connectionId);
    setRemoteFileBrowserOpen(true);
  };

  const handleSelectCollection = (result) => {
    console.log('Collection opened:', result);
    // Collection will be automatically opened via IPC events
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
      {sshConnectionDialogOpen ? (
        <SshConnectionDialog
          isOpen={sshConnectionDialogOpen}
          onClose={() => setSshConnectionDialogOpen(false)}
          onConnect={handleSshConnect}
        />
      ) : null}
      {remoteFileBrowserOpen ? (
        <RemoteFileBrowser
          isOpen={remoteFileBrowserOpen}
          onClose={() => setRemoteFileBrowserOpen(false)}
          connectionId={currentConnectionId}
          onSelectCollection={handleSelectCollection}
        />
      ) : null}

      <div className="collections-badge flex items-center justify-between px-2 mt-2 relative">
        <div className="flex items-center  py-1 select-none">
          <span className="mr-2">
            <IconFolders size={18} strokeWidth={1.5} />
          </span>
          <span>Collections</span>
        </div>
        <div className="flex items-center collections-header-actions">
          <button
            className="mr-1 collection-action-button"
            onClick={() => setSshConnectionDialogOpen(true)}
            aria-label="Open Remote Collection"
            title="Open Remote Collection"
          >
            <IconCloud size={18} strokeWidth={1.5} className="cursor-pointer" />
          </button>

          {collections.length >= 1 && (
            <>
              <button
                className="mr-1 collection-action-button"
                onClick={selectAllCollectionsToClose}
                aria-label="Close all collections"
                title="Close all collections"
                data-testid="close-all-collections-button"
              >
                <CloseAllIcon size={18} strokeWidth={1.5} className="cursor-pointer" />
              </button>
              <button
                className="collection-action-button"
                onClick={() => sortCollectionOrder()}
                aria-label="Sort collections"
                title="Sort collections"
              >
                {sortIcon}
              </button>
              {collectionsToClose.length > 0 && (
                <RemoveCollectionsModal collectionUids={collectionsToClose} onClose={clearCollectionsToClose} />
              )}
            </>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionsHeader;
