import BulkActionsMenu from 'components/Sidebar/Collections/BulkActionsMenu';
import useBulkActionsMenu from 'hooks/useBulkActionsMenu';
import useDebounce from 'hooks/useDebounce';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { fetchCollectionTreeFromIndex, indexActiveWorkspaceCollections, mountUnmountedActiveWorkspaceCollections, searchCollectionTreesFromIndex } from 'providers/ReduxStore/slices/collections/actions';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';
import IndeterminateProgressBar from 'ui/IndeterminateProgressBar';
import { buildIndexes, flattenSidebarTree } from 'utils/collections/flattenSidebarTree';
import { buildSidebarEntries, getSelectionInfo } from 'utils/collections/index';
import { normalizePath } from 'utils/common/path';
import { CollectionItemDragPreview } from './Collection/CollectionItem/CollectionItemDragPreview';
import CollectionSearch from './CollectionSearch/index';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import InlineCollectionCreator from './InlineCollectionCreator';
import SidebarRow from './SidebarRow';
import StyledWrapper from './StyledWrapper';

const SEARCH_DEBOUNCE_MS = 350;

const Collections = ({ showSearch, isCreatingCollection, onCreateClick, onDismissCreate, onOpenAdvancedCreate }) => {
  // The input renders from `searchText` so typing stays instant; everything that has to walk the
  // tree reads `debouncedSearchText`, so a burst of keystrokes rebuilds the rows once, not per character.
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, SEARCH_DEBOUNCE_MS);
  const { collections, collectionSortOrder, selectedSidebarUids } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const searchIndexBuilding = useSelector((state) => state.app.searchIndexBuilding);
  const searchIndexEnabled = useSelector((state) => state.app.preferences?.cache?.searchIndex?.enabled);
  const searchIndexBuildTrigger = useSelector((state) => state.app.preferences?.cache?.searchIndex?.buildTrigger);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const dispatch = useDispatch();
  const virtuosoRef = useRef(null);
  const lastScrolledTabUidRef = useRef(null);
  const hasMountedForSearchRef = useRef(false);
  const pendingTreeFetchUidsRef = useRef(new Set());

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

  // A collection that isn't mounted yet has no `collection.items` - its structure lives only in
  // the search index until a real mount runs. Fetched on expand, keyed by uid, and merged into the
  // entry below rather than written to Redux: it's a read-only stand-in, not collection state.
  const [indexTreesByUid, setIndexTreesByUid] = useState({});
  const [searchTreesByPath, setSearchTreesByPath] = useState({});
  const [isSearchIndexPending, setIsSearchIndexPending] = useState(false);

  useEffect(() => {
    const toFetch = sidebarEntries.filter((entry) =>
      entry.kind === 'loaded'
      && entry.collection.mountStatus !== 'mounted'
      && !entry.collection.collapsed
      && !(entry.collection.uid in indexTreesByUid)
      && !pendingTreeFetchUidsRef.current.has(entry.collection.uid));

    toFetch.forEach((entry) => {
      const { collection } = entry;
      pendingTreeFetchUidsRef.current.add(collection.uid);
      dispatch(fetchCollectionTreeFromIndex({
        collectionPath: collection.pathname,
        collectionName: collection.name
      }))
        .then(({ items }) => {
          pendingTreeFetchUidsRef.current.delete(collection.uid);
          setIndexTreesByUid((prev) => ({ ...prev, [collection.uid]: items }));
        })
        .catch(() => {
          pendingTreeFetchUidsRef.current.delete(collection.uid);
          setIndexTreesByUid((prev) => ({ ...prev, [collection.uid]: [] }));
        });
    });

    if (!searchText.trim()) {
      setSearchTreesByPath({});
      setIsSearchIndexPending(false);
      hasMountedForSearchRef.current = false;
      return;
    }

    if (searchIndexEnabled && searchIndexBuildTrigger === 'on-search' && !hasMountedForSearchRef.current) {
      hasMountedForSearchRef.current = true;
      dispatch(mountUnmountedActiveWorkspaceCollections());
      dispatch(indexActiveWorkspaceCollections());
    }

    if (searchText !== debouncedSearchText) return;

    let cancelled = false;
    setIsSearchIndexPending(true);
    dispatch(searchCollectionTreesFromIndex(debouncedSearchText, activeWorkspace?.pathname))
      .then((trees) => {
        if (cancelled) return;
        const byPath = {};
        for (const [collectionPath, items] of Object.entries(trees || {})) {
          byPath[normalizePath(collectionPath)] = items;
        }
        setSearchTreesByPath(byPath);
      })
      .catch(() => {
        if (!cancelled) setSearchTreesByPath({});
      })
      .finally(() => {
        if (!cancelled) setIsSearchIndexPending(false);
      });

    return () => { cancelled = true; };
  }, [sidebarEntries, indexTreesByUid, searchText, debouncedSearchText, dispatch, activeWorkspace, searchIndexEnabled, searchIndexBuildTrigger]);

  const renderedSidebarEntries = useMemo(() => sidebarEntries.map((entry) => {
    if (entry.kind !== 'loaded' || entry.collection.mountStatus === 'mounted') return entry;
    const items = indexTreesByUid[entry.collection.uid] || searchTreesByPath[normalizePath(entry.collection.pathname)];
    if (!items) return entry;
    return { ...entry, collection: { ...entry.collection, items } };
  }), [sidebarEntries, indexTreesByUid, searchTreesByPath]);

  // Flatten the tree into ordered rows. itemsByUid / collectionsByUid resolve a row's live object.
  const { rows, itemsByUid, collectionsByUid } = useMemo(
    () => flattenSidebarTree(renderedSidebarEntries, { searchText: debouncedSearchText }),
    [renderedSidebarEntries, debouncedSearchText]
  );

  const isSearchPending = searchText !== debouncedSearchText || isSearchIndexPending;
  const showIndexingText = searchIndexBuilding && isSearchPending;

  // Ghost rows carry only path/name. GitRemoteCollectionRow needs the full entry (for `remote`).
  const ghostsByPath = useMemo(() => {
    const map = new Map();
    for (const entry of sidebarEntries) {
      if (entry.kind === 'ghost' && entry.entry?.path) map.set(entry.entry.path, entry.entry);
    }
    return map;
  }, [sidebarEntries]);

  // Multi-select drag context, computed once for the whole list and threaded to rows via SidebarRow.
  const selectionInfo = useMemo(
    () => (selectedSidebarUids.length > 1 ? getSelectionInfo({ collections, selectedUids: selectedSidebarUids }) : null),
    [collections, selectedSidebarUids]
  );

  // A collection can't be dragged together with folders/requests/apps from inside it.
  const hasMixedCollectionSelection = Boolean(
    selectionInfo?.hasCollection
    && (selectionInfo.hasFolder || selectionInfo.hasRequest || selectionInfo.hasApp)
  );

  // Whether a selected collection row can be dragged as part of the multi-selection.
  const isCollectionMultiDragDisabled = !!selectionInfo && (selectionInfo.hasExample || hasMixedCollectionSelection);

  // Whether a selected folder/request/app row can be dragged as part of the multi-selection.
  const isItemMultiDragDisabled = !!selectionInfo && (selectionInfo.hasExample || selectionInfo.hasCollection);

  const multiDragCollections = useMemo(() => {
    if (!selectionInfo || selectionInfo.hasFolder || selectionInfo.hasRequest || selectionInfo.hasApp || selectionInfo.hasExample) return null;
    return selectionInfo.effectiveSelection.filter((entry) => entry.type === 'collection').map((entry) => entry.collection);
  }, [selectionInfo]);

  const multiDragItems = useMemo(() => {
    if (!selectionInfo || selectionInfo.hasCollection || selectionInfo.hasExample) return null;
    return selectionInfo.effectiveSelection.map((entry) => ({ ...entry.item, sourceCollectionUid: entry.collectionUid }));
  }, [selectionInfo]);

  const { rowIndexByItemUid, rowIndexByCollectionUid } = useMemo(() => buildIndexes(rows), [rows]);

  // Resolve the active tab's row index (item rows first, then collection headers).
  const rowIndex = rowIndexByItemUid.get(activeTabUid);
  const activeRowIndex = activeTabUid !== null
    ? (rowIndex ?? rowIndexByCollectionUid.get(activeTabUid) ?? null)
    : null;

  useEffect(() => {
    if (activeRowIndex === null) return;
    if (lastScrolledTabUidRef.current === activeTabUid) return;
    virtuosoRef.current?.scrollIntoView({ index: activeRowIndex, behavior: 'smooth' });
    lastScrolledTabUidRef.current = activeTabUid;
  }, [activeTabUid, activeRowIndex]);

  // Clear multi-selection only when clicking the bare scroller background.
  // The `contains` guard ignores events propagated from portaled menus/modals in <body>.
  // The `[data-sidebar-row]` check covers all row types and inline menus/modals rendered within a row.
  const handleContainerClick = (e) => {
    if (!e.currentTarget.contains(e.target)) return;
    if (e.target.closest('[data-sidebar-row]')) return;
    dispatch(clearSidebarSelection());
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

      {showSearch && showIndexingText && (
        <div className="search-index-status" data-testid="sidebar-indexing-status">Indexing…</div>
      )}
      {showSearch && (
        <IndeterminateProgressBar
          active={isSearchPending || searchIndexBuilding}
          data-testid="sidebar-progress"
        />
      )}

      {isCreatingCollection && (
        <InlineCollectionCreator
          onComplete={onDismissCreate}
          onCancel={onDismissCreate}
          onOpenAdvanced={onOpenAdvancedCreate}
        />
      )}

      <div
        className="collections-list flex flex-col flex-1 overflow-hidden"
        onClick={handleContainerClick}
      >
        <Virtuoso
          ref={virtuosoRef}
          data-testid="sidebar-collections-scroller"
          style={{ height: '100%' }}
          data={rows}
          computeItemKey={(_, row) => row.id}
          defaultItemHeight={26}
          increaseViewportBy={{ top: 400, bottom: 600 }}
          itemContent={(_, row) => (
            <SidebarRow
              row={row}
              searchText={debouncedSearchText}
              openBulkMenu={openBulkMenu}
              itemsByUid={itemsByUid}
              collectionsByUid={collectionsByUid}
              ghostsByPath={ghostsByPath}
              isCollectionMultiDragDisabled={isCollectionMultiDragDisabled}
              isItemMultiDragDisabled={isItemMultiDragDisabled}
              multiDragCollections={multiDragCollections}
              multiDragItems={multiDragItems}
            />
          )}
        />
      </div>
      <CollectionItemDragPreview />
      <BulkActionsMenu menuProps={menuProps} />
    </StyledWrapper>
  );
};

export default Collections;
