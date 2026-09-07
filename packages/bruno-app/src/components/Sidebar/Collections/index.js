import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import InlineCollectionCreator from './InlineCollectionCreator';
import SidebarRow from './SidebarRow';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { buildSidebarEntries } from 'utils/collections/index';
import { flattenSidebarTree, buildIndexes } from 'utils/collections/flattenSidebarTree';
import { CollectionItemDragPreview } from './Collection/CollectionItem/CollectionItemDragPreview';
import useBulkActionsMenu from 'hooks/useBulkActionsMenu';
import BulkActionsMenu from 'components/Sidebar/Collections/BulkActionsMenu';

const Collections = ({ showSearch, isCreatingCollection, onCreateClick, onDismissCreate, onOpenAdvancedCreate }) => {
  const [searchText, setSearchText] = useState('');
  const { collections, collectionSortOrder } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const dispatch = useDispatch();
  const virtuosoRef = useRef(null);

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

  // Flatten the tree into ordered rows. itemsByUid / collectionsByUid resolve a row's live object.
  const { rows, itemsByUid, collectionsByUid } = useMemo(
    () => flattenSidebarTree(sidebarEntries, { searchText }),
    [sidebarEntries, searchText]
  );

  // Ghost rows carry only path/name. GitRemoteCollectionRow needs the full entry (for `remote`).
  const ghostsByPath = useMemo(() => {
    const map = new Map();
    for (const entry of sidebarEntries) {
      if (entry.kind === 'ghost' && entry.entry?.path) map.set(entry.entry.path, entry.entry);
    }
    return map;
  }, [sidebarEntries]);

  const { rowIndexByItemUid, rowIndexByCollectionUid } = useMemo(() => buildIndexes(rows), [rows]);

  // Resolve the active tab's row index. ref lets the scroll effect read the current index
  // without depending on it, so rows shifting above the active row don't re-fire the scroll.
  const rowIndex = rowIndexByItemUid.get(activeTabUid);
  const activeRowIndex = activeTabUid !== null
    ? (rowIndex ?? rowIndexByCollectionUid.get(activeTabUid) ?? null)
    : null;
  const activeRowIndexRef = useRef(activeRowIndex);
  activeRowIndexRef.current = activeRowIndex;

  useEffect(() => {
    const index = activeRowIndexRef.current;
    if (index === null) return;
    virtuosoRef.current?.scrollIntoView({ index, behavior: 'auto' });
  }, [activeTabUid]);

  // Clear the multi-selection on empty-space clicks (not on a row). The `contains` guard drops
  // events React propagates here from portaled modals/menus in <body>, which sit outside the sidebar.
  const handleContainerClick = (e) => {
    if (!e.currentTarget.contains(e.target)) return;
    const onRow = e.target.closest('[data-testid="sidebar-collection-item-row"], [data-testid="sidebar-collection-row"]');
    if (!onRow) {
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
              searchText={searchText}
              openBulkMenu={openBulkMenu}
              itemsByUid={itemsByUid}
              collectionsByUid={collectionsByUid}
              ghostsByPath={ghostsByPath}
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
