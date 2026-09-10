import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Collection from './Collection';
import GitRemoteCollectionRow from './GitRemoteCollectionRow';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import InlineCollectionCreator from './InlineCollectionCreator';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { buildSidebarEntries, getSelectionInfo } from 'utils/collections/index';
import { CollectionItemDragPreview } from './Collection/CollectionItem/CollectionItemDragPreview';
import useBulkActionsMenu from 'hooks/useBulkActionsMenu';
import BulkActionsMenu from 'components/Sidebar/Collections/BulkActionsMenu';

const Collections = ({ showSearch, isCreatingCollection, onCreateClick, onDismissCreate, onOpenAdvancedCreate }) => {
  const [searchText, setSearchText] = useState('');
  const { collections, collectionSortOrder, selectedSidebarUids } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const dispatch = useDispatch();

  const { openBulkMenu, menuProps } = useBulkActionsMenu();

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');

  // Build the sidebar list in workspace.yml order. Each entry is either a fully
  // loaded collection (rendered via <Collection />) or, for non-default workspaces,
  // a "ghost" git-backed entry whose local folder is missing (rendered via
  // <GitRemoteCollectionRow /> so the user can click to clone it).
  const sidebarEntries = useMemo(
    () => buildSidebarEntries({ collections, workspaces, activeWorkspace, collectionSortOrder }),
    [activeWorkspace, collections, workspaces, collectionSortOrder]
  );

  const selectionInfo = useMemo(
    () => (selectedSidebarUids.length > 1 ? getSelectionInfo({ collections, selectedUids: selectedSidebarUids }) : null),
    [collections, selectedSidebarUids]
  );

  const isMultiDragDisabled = !!selectionInfo && (
    selectionInfo.hasExample || (selectionInfo.hasCollection && (selectionInfo.hasFolder || selectionInfo.hasRequest || selectionInfo.hasApp))
  );

  const isItemMultiDragDisabled = !!selectionInfo && (selectionInfo.hasExample || selectionInfo.hasCollection);

  const multiDragCollections = useMemo(() => {
    if (!selectionInfo || selectionInfo.hasFolder || selectionInfo.hasRequest || selectionInfo.hasApp || selectionInfo.hasExample) return null;
    return selectionInfo.effectiveSelection.filter((entry) => entry.type === 'collection').map((entry) => entry.collection);
  }, [selectionInfo]);

  const multiDragItems = useMemo(() => {
    if (!selectionInfo || selectionInfo.hasCollection || selectionInfo.hasExample) return null;
    return selectionInfo.effectiveSelection.map((entry) => ({ ...entry.item, sourceCollectionUid: entry.collectionUid }));
  }, [selectionInfo]);

  const handleContainerClick = (e) => {
    if (e.currentTarget === e.target) {
      dispatch(clearSidebarSelection());
    }
  };

  if (!sidebarEntries.length) {
    return (
      <StyledWrapper>
        {isCreatingCollection && (
          <InlineCollectionCreator
            onComplete={onDismissCreate}
            onCancel={onDismissCreate}
            onOpenAdvanced={onOpenAdvancedCreate}
          />
        )}
        {!isCreatingCollection && <CreateOrOpenCollection onCreateClick={onCreateClick} />}
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper data-testid="collections">
      {showSearch && (
        <CollectionSearch searchText={searchText} setSearchText={setSearchText} />
      )}

      <div
        className="collections-list flex flex-col flex-1 overflow-hidden hover:overflow-y-auto"
        onClick={handleContainerClick}
      >
        {isCreatingCollection && (
          <InlineCollectionCreator
            onComplete={onDismissCreate}
            onCancel={onDismissCreate}
            onOpenAdvanced={onOpenAdvancedCreate}
          />
        )}
        {sidebarEntries.map((entry) => {
          if (entry.kind === 'loaded') {
            return (
              <Collection
                searchText={searchText}
                collection={entry.collection}
                key={entry.key}
                openBulkMenu={openBulkMenu}
                isMultiDragDisabled={isMultiDragDisabled}
                isItemMultiDragDisabled={isItemMultiDragDisabled}
                multiDragCollections={multiDragCollections}
                multiDragItems={multiDragItems}
              />
            );
          }
          return <GitRemoteCollectionRow entry={entry.entry} key={entry.key} />;
        })}
      </div>
      <CollectionItemDragPreview />
      <BulkActionsMenu menuProps={menuProps} />
    </StyledWrapper>
  );
};

export default Collections;
