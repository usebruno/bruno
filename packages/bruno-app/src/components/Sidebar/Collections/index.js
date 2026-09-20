import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';
import Collection from './Collection';
import CollectionItem from './Collection/CollectionItem';
import GitRemoteCollectionRow from './GitRemoteCollectionRow';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import InlineCollectionCreator from './InlineCollectionCreator';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { buildSidebarEntries, getSelectionInfo, getVisibleSidebarRows } from 'utils/collections/index';
import { buildSidebarSearchIndex } from 'utils/collections/search';
import { CollectionItemDragPreview } from './Collection/CollectionItem/CollectionItemDragPreview';
import useBulkActionsMenu from 'hooks/useBulkActionsMenu';
import useDebounce from 'hooks/useDebounce';
import IndeterminateProgressBar from 'ui/IndeterminateProgressBar';
import BulkActionsMenu from 'components/Sidebar/Collections/BulkActionsMenu';

// Long enough that a typed word resolves in one pass rather than once per character, short enough
// that the results still feel attached to the keystroke.
const SEARCH_DEBOUNCE_MS = 350;

const Collections = ({ showSearch, isCreatingCollection, onCreateClick, onDismissCreate, onOpenAdvancedCreate }) => {
  // The input renders from `searchText` so typing stays instant; everything that has to walk the
  // tree reads `debouncedSearchText`, so a burst of keystrokes rebuilds the index and re-renders
  // the tree once rather than per character.
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, SEARCH_DEBOUNCE_MS);
  // Subscribed field by field: selecting the whole collections slice re-renders the entire
  // sidebar whenever any unrelated part of it changes (active connections, runner state,
  // last-clicked uid, transient directories).
  const collections = useSelector((state) => state.collections.collections);
  const collectionSortOrder = useSelector((state) => state.collections.collectionSortOrder);
  const selectedSidebarUids = useSelector((state) => state.collections.selectedSidebarUids);
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

  // Which rows a search leaves visible, resolved once per term for the whole sidebar. Each row then
  // checks membership instead of searching its own subtree while it renders.
  const searchIndex = useMemo(
    () => buildSidebarSearchIndex(collections, debouncedSearchText),
    [collections, debouncedSearchText]
  );

  // Shown while the workspace is still being indexed, and while a search is settling — the two
  // moments the tree on screen is not yet the answer to what the user asked for.
  const isIndexing = sidebarEntries.some(
    (entry) => entry.kind === 'loaded' && entry.collection.mountStatus === 'mounting'
  );
  const isSearchPending = searchText !== debouncedSearchText;
  const hasSearchText = Boolean(debouncedSearchText.trim().length);

  // Only while searching. A search opens every folder that contains a match, so the tree it renders
  // is unbounded — that is the case worth virtualising, and it is also the one where drag and drop
  // is meaningless, since an item's real neighbours are filtered out of view.
  const searchRows = useMemo(
    () => (hasSearchText ? getVisibleSidebarRows({ sidebarEntries, searchText: debouncedSearchText }) : []),
    [hasSearchText, sidebarEntries, debouncedSearchText]
  );

  const selectionInfo = useMemo(
    () => (selectedSidebarUids.length > 1 ? getSelectionInfo({ collections, selectedUids: selectedSidebarUids }) : null),
    [collections, selectedSidebarUids]
  );

  const isMultiDragDisabled = !!selectionInfo && selectionInfo.hasCollection && (selectionInfo.hasFolder || selectionInfo.hasRequest || selectionInfo.hasApp);

  const multiDragCollections = useMemo(() => {
    if (!selectionInfo || selectionInfo.hasFolder || selectionInfo.hasRequest) return null;
    return selectionInfo.effectiveSelection.filter((entry) => entry.type === 'collection').map((entry) => entry.collection);
  }, [selectionInfo]);

  const multiDragItems = useMemo(() => {
    if (!selectionInfo || selectionInfo.hasCollection) return null;
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

      <IndeterminateProgressBar
        active={isIndexing || isSearchPending}
        data-testid="sidebar-progress"
      />

      <div
        // While searching, Virtuoso is the scroller; a second scroll container around it would
        // fight it for the wheel and break its viewport measurement.
        className={`collections-list flex flex-col flex-1 overflow-hidden${hasSearchText ? '' : ' hover:overflow-y-auto'}`}
        onClick={handleContainerClick}
      >
        {isCreatingCollection && (
          <InlineCollectionCreator
            onComplete={onDismissCreate}
            onCancel={onDismissCreate}
            onOpenAdvanced={onOpenAdvancedCreate}
          />
        )}
        {hasSearchText ? (
          <Virtuoso
            data={searchRows}
            // minHeight:0 lets a flex child shrink below its content, which is what gives Virtuoso
            // a bounded height to measure instead of growing to the full list.
            style={{ flex: '1 1 auto', minHeight: 0 }}
            computeItemKey={(index, row) => row.uid}
            itemContent={(index, row) => (row.kind === 'collection' ? (
              <Collection
                flat
                collection={row.collection}
                searchText={debouncedSearchText}
                searchIndex={searchIndex}
                openBulkMenu={openBulkMenu}
                isMultiDragDisabled={isMultiDragDisabled}
                multiDragCollections={multiDragCollections}
                multiDragItems={multiDragItems}
              />
            ) : (
              <CollectionItem
                flat
                item={row.item}
                collectionUid={row.collection.uid}
                collectionPathname={row.collection.pathname}
                searchText={debouncedSearchText}
                searchIndex={searchIndex}
                openBulkMenu={openBulkMenu}
                isMultiDragDisabled={isMultiDragDisabled}
                multiDragItems={multiDragItems}
              />
            ))}
          />
        ) : sidebarEntries.map((entry) => {
          if (entry.kind === 'loaded') {
            return (
              <Collection
                searchText={debouncedSearchText}
                searchIndex={searchIndex}
                collection={entry.collection}
                key={entry.key}
                openBulkMenu={openBulkMenu}
                isMultiDragDisabled={isMultiDragDisabled}
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
