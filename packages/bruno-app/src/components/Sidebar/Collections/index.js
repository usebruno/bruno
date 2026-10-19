import BulkActionsMenu from 'components/Sidebar/Collections/BulkActionsMenu';
import useBulkActionsMenu from 'hooks/useBulkActionsMenu';
import useDebounce from 'hooks/useDebounce';
import useSearchIndexWrites from 'hooks/useSearchIndexWrites';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { indexActiveWorkspaceCollections, searchCollectionTreesFromIndex } from 'providers/ReduxStore/slices/collections/actions';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const SEARCH_PAGE_SIZE = 300;

const isEmptyQuery = (value) => typeof value === 'string' && value.trim() === '';

const Collections = ({ showSearch, isCreatingCollection, onCreateClick, onDismissCreate, onOpenAdvancedCreate }) => {
  // The input renders from `searchText` so typing stays instant; everything that has to walk the
  // tree reads `debouncedSearchText`, so a burst of keystrokes rebuilds the rows once, not per character.
  const [searchText, setSearchText] = useState('');
  const [searchCollapsedUids, setSearchCollapsedUids] = useState(() => new Set());
  const trimmedSearchText = searchText.trim();
  const debouncedSearchText = useDebounce(trimmedSearchText, SEARCH_DEBOUNCE_MS, { shouldSkipDebounce: isEmptyQuery });
  const { collections, collectionSortOrder, selectedSidebarUids } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const searchIndexBuilding = useSelector((state) => state.app.searchIndexBuilding);
  const searchIndexStatus = useSelector((state) => state.app.searchIndexStatus);
  const searchIndexEnabled = useSelector((state) => state.app.preferences?.cache?.searchIndex?.enabled);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const dispatch = useDispatch();
  const virtuosoRef = useRef(null);
  const lastScrolledTabUidRef = useRef(null);
  const hasMountedForSearchRef = useRef(false);
  const searchTextRef = useRef(searchText);
  searchTextRef.current = searchText;
  const activeWorkspacePathnameRef = useRef(null);
  const searchIndexBuildingRef = useRef(searchIndexBuilding);
  searchIndexBuildingRef.current = searchIndexBuilding;
  const wasSearchIndexBuildingRef = useRef(false);
  const lastQueriedTextRef = useRef('');
  const searchRequestIdRef = useRef(0);
  const lastSearchResultRef = useRef(null);
  const searchLimitRef = useRef(SEARCH_PAGE_SIZE);
  const searchCollectionPathsRef = useRef([]);
  const [searchCounts, setSearchCounts] = useState(null);
  const searchCountsRef = useRef(null);
  searchCountsRef.current = searchCounts;
  const { openBulkMenu, menuProps } = useBulkActionsMenu();

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');
  activeWorkspacePathnameRef.current = activeWorkspace?.pathname;

  // Build the sidebar list in workspace.yml order. Each entry is either a fully
  // loaded collection (rendered via <Collection />) or, for non-default workspaces,
  // a "ghost" git-backed entry whose local folder is missing (rendered via
  // <GitRemoteCollectionRow /> so the user can click to clone it).
  const sidebarEntries = useMemo(
    () => buildSidebarEntries({ collections, workspaces, activeWorkspace, collectionSortOrder }),
    [activeWorkspace, collections, workspaces, collectionSortOrder]
  );
  searchCollectionPathsRef.current = sidebarEntries
    .filter((entry) => entry.kind === 'loaded' && entry.collection.mountStatus !== 'mounted')
    .map((entry) => entry.collection.pathname);

  // A collection that isn't mounted yet has no `collection.items` - its structure lives only in
  // the search index until a real mount runs. Fetched on expand, keyed by uid, and merged into the
  // entry below rather than written to Redux: it's a read-only stand-in, not collection state.
  const [searchTreesByPath, setSearchTreesByPath] = useState({});
  const [isSearchIndexPending, setIsSearchIndexPending] = useState(false);

  // Search runs against the search index only (mounted or not). Only one window of matches is asked for at a time
  // (collections in sidebar order), and the next window is loaded when the list is scrolled to its end.
  const runIndexSearch = useCallback(() => {
    const text = searchTextRef.current.trim();
    if (!text) return;
    const limit = searchLimitRef.current;
    const queryKey = `${text}\n${limit}`;
    // Once the index is complete, repeating the same query would return the same rows
    if (!searchIndexBuildingRef.current && queryKey === lastQueriedTextRef.current) return;
    lastQueriedTextRef.current = queryKey;

    const requestId = ++searchRequestIdRef.current;
    const workspacePath = activeWorkspacePathnameRef.current;
    const lastResult = lastSearchResultRef.current;
    const knownRevision = lastResult && lastResult.key === queryKey && lastResult.workspacePath === workspacePath ? lastResult.revision : undefined;
    setIsSearchIndexPending(true);
    dispatch(searchCollectionTreesFromIndex(text, workspacePath, knownRevision, { limit, collectionPaths: searchCollectionPathsRef.current }))
      .then((result) => {
        if (requestId !== searchRequestIdRef.current) return;
        const { trees, revision, unchanged, total, loaded } = result || {};
        if (unchanged) return;
        lastSearchResultRef.current = { key: queryKey, workspacePath, revision };
        setSearchCounts(total === undefined ? null : { total, loaded });
        const byPath = {};
        for (const [collectionPath, items] of Object.entries(trees || {})) {
          byPath[normalizePath(collectionPath)] = items;
        }
        setSearchTreesByPath(byPath);
      })
      .catch(() => {
        if (requestId !== searchRequestIdRef.current) return;
        lastSearchResultRef.current = null;
        setSearchTreesByPath({});
      })
      .finally(() => {
        if (requestId === searchRequestIdRef.current && !searchIndexBuildingRef.current) setIsSearchIndexPending(false);
      });
  }, [dispatch]);

  useSearchIndexWrites(runIndexSearch);

  const loadMoreSearchResults = () => {
    const counts = searchCountsRef.current;
    if (!searchTextRef.current.trim() || !counts || counts.loaded >= counts.total) return;
    searchLimitRef.current += SEARCH_PAGE_SIZE;
    runIndexSearch();
  };

  useEffect(() => {
    const stopSearchIndexRefresh = () => {
      searchRequestIdRef.current += 1;
      lastQueriedTextRef.current = '';
      lastSearchResultRef.current = null;
      wasSearchIndexBuildingRef.current = false;
    };

    if (!searchText.trim()) {
      stopSearchIndexRefresh();
      setSearchTreesByPath({});
      setIsSearchIndexPending(false);
      hasMountedForSearchRef.current = false;
      return;
    }

    // Without a search index there is nothing to query; the rows are filtered in memory instead
    if (!searchIndexEnabled) {
      stopSearchIndexRefresh();
      setSearchTreesByPath({});
      setIsSearchIndexPending(false);
      return;
    }

    if (!hasMountedForSearchRef.current) {
      hasMountedForSearchRef.current = true;
      dispatch(indexActiveWorkspaceCollections());
    }

    // The index just finished building: the final search must not be skipped as a repeat of the last one
    if (wasSearchIndexBuildingRef.current && !searchIndexBuilding) {
      lastQueriedTextRef.current = '';
    }
    wasSearchIndexBuildingRef.current = searchIndexBuilding;

    if (searchIndexBuilding) setIsSearchIndexPending(true);
    runIndexSearch();
  }, [sidebarEntries, searchText, dispatch, searchIndexEnabled, searchIndexBuilding, runIndexSearch]);

  const renderedSidebarEntries = useMemo(() => sidebarEntries.map((entry) => {
    if (entry.kind !== 'loaded' || entry.collection.mountStatus === 'mounted') return entry;
    const items = searchTreesByPath[normalizePath(entry.collection.pathname)];
    if (!items) return entry;
    return { ...entry, collection: { ...entry.collection, items } };
  }), [sidebarEntries, searchTreesByPath]);

  const { rows, itemsByUid, collectionsByUid } = useMemo(
    () => flattenSidebarTree(renderedSidebarEntries, { searchText: debouncedSearchText, collapsedUids: searchCollapsedUids }),
    [renderedSidebarEntries, debouncedSearchText, searchCollapsedUids]
  );

  const toggleSearchCollapse = useCallback((uid) => {
    setSearchCollapsedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }, []);

  const updateSearchText = (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setSearchCounts(null);
    }
    if (trimmed !== searchTextRef.current.trim()) {
      searchLimitRef.current = SEARCH_PAGE_SIZE;
      searchRequestIdRef.current += 1;
    }
    setSearchText(text);
    if (!trimmed) {
      setSearchCollapsedUids(new Set());
    }
  };

  const isSearchPending = trimmedSearchText !== debouncedSearchText || isSearchIndexPending;
  const showIndexingProgress = Boolean(trimmedSearchText && searchIndexBuilding && searchIndexStatus?.total > 0);
  const indexingCollectionNumber = searchIndexStatus?.total > 0
    ? Math.min((searchIndexStatus.completed ?? 0) + 1, searchIndexStatus.total)
    : null;
  const indexingProgressValue = searchIndexStatus?.total > 0
    ? (searchIndexStatus.completed ?? 0) / searchIndexStatus.total
    : 0;
  const showQueryPendingText = Boolean(trimmedSearchText && isSearchPending && !searchIndexBuilding);

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
        <CollectionSearch searchText={searchText} setSearchText={updateSearchText} />
      )}

      {showSearch && showIndexingProgress && (
        <div className="search-index-status" data-testid="sidebar-indexing-status">
          {`Indexing collection ${indexingCollectionNumber} of ${searchIndexStatus.total}…`}
        </div>
      )}
      {showSearch && showQueryPendingText && (
        <div className="search-index-status" data-testid="sidebar-search-pending">Searching…</div>
      )}
      {showSearch && showIndexingProgress && (
        <IndeterminateProgressBar
          value={indexingProgressValue}
          data-testid="sidebar-progress"
        />
      )}
      {/* {trimmedSearchText && searchCounts && searchCounts.loaded < searchCounts.total && (
        <div className="search-more-hint" data-testid="sidebar-search-more">
          Showing {searchCounts.loaded} of {searchCounts.total} matches. Scroll down to load more.
        </div>
      )} */}

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
          endReached={loadMoreSearchResults}
          computeItemKey={(_, row) => row.id}
          defaultItemHeight={26}
          increaseViewportBy={{ top: 400, bottom: 600 }}
          itemContent={(_, row) => (
            <SidebarRow
              row={row}
              searchText={debouncedSearchText}
              searchCollapsedUids={searchCollapsedUids}
              onToggleSearchCollapse={toggleSearchCollapse}
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
