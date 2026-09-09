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

  // Resolve the active tab's row index (item rows first, then collection headers).
  const rowIndex = rowIndexByItemUid.get(activeTabUid);
  const activeRowIndex = activeTabUid !== null
    ? (rowIndex ?? rowIndexByCollectionUid.get(activeTabUid) ?? null)
    : null;

  useEffect(() => {
    if (activeRowIndex === null) return;
    virtuosoRef.current?.scrollIntoView({ index: activeRowIndex, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabUid]);

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
