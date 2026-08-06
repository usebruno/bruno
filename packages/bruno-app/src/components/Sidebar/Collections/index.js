import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import InlineCollectionCreator from './InlineCollectionCreator';
import SidebarRow from './SidebarRow';
import { flattenSidebarTree, buildIndexes } from 'utils/collections/flattenSidebarTree';
import path, { normalizePath } from 'utils/common/path';
import { isScratchCollection } from 'utils/collections';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const getSidebarEntryName = (entry) => {
  if (entry.kind === 'loaded') {
    return entry.collection?.name || '';
  }

  return entry.entry?.name || path.basename(entry.entry?.path || '');
};

const Collections = ({ showSearch, isCreatingCollection, onCreateClick, onDismissCreate, onOpenAdvancedCreate }) => {
  const [searchText, setSearchText] = useState('');
  const { collections, collectionSortOrder } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const virtuosoRef = useRef(null);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');
  const isDefaultWorkspace = activeWorkspace?.type === 'default';

  // Build the sidebar list in workspace.yml order. Each entry is either a fully
  // loaded collection (rendered via <Collection />) or, for non-default workspaces,
  // a "ghost" git-backed entry whose local folder is missing (rendered via
  // <GitRemoteCollectionRow /> so the user can click to clone it).
  const sidebarEntries = useMemo(() => {
    if (!activeWorkspace?.collections?.length) return [];

    const loadedByPath = new Map();
    for (const c of collections) {
      if (isScratchCollection(c, workspaces)) continue;
      if (c.pathname) loadedByPath.set(normalizePath(c.pathname), c);
    }

    const entries = [];
    for (const wc of activeWorkspace.collections) {
      if (!wc.path) continue;
      const loaded = loadedByPath.get(normalizePath(wc.path));
      if (loaded) {
        entries.push({ kind: 'loaded', collection: loaded, key: loaded.uid });
      } else if (wc.remote && !isDefaultWorkspace) {
        entries.push({ kind: 'ghost', entry: wc, key: `ghost:${wc.path}` });
      }
    }
    if (collectionSortOrder === 'alphabetical') {
      return [...entries].sort((a, b) => collator.compare(getSidebarEntryName(a), getSidebarEntryName(b)));
    }

    if (collectionSortOrder === 'reverseAlphabetical') {
      return [...entries].sort((a, b) => -collator.compare(getSidebarEntryName(a), getSidebarEntryName(b)));
    }

    return entries;
  }, [activeWorkspace, collections, workspaces, isDefaultWorkspace, collectionSortOrder]);

  const { rows, itemsByUid, collectionsByUid } = useMemo(
    () => flattenSidebarTree(sidebarEntries, { searchText }),
    [sidebarEntries, searchText]
  );

  // Ghost rows carry only path/name; GitRemoteCollectionRow needs the full entry (for `remote`).
  const ghostsByPath = useMemo(() => {
    const map = new Map();
    for (const entry of sidebarEntries) {
      if (entry.kind === 'ghost' && entry.entry?.path) map.set(entry.entry.path, entry.entry);
    }
    return map;
  }, [sidebarEntries]);

  const { rowIndexByItemUid, rowIndexByCollectionUid } = useMemo(() => buildIndexes(rows), [rows]);

  // get the active item(request/folder/collection tab) index and scroll that into view.
  const rowIndex = rowIndexByItemUid.get(activeTabUid);
  const activeRowIndex = activeTabUid !== null
    ? (rowIndex ?? rowIndexByCollectionUid.get(activeTabUid) ?? null)
    : null;

  useEffect(() => {
    if (activeRowIndex === null) return;

    virtuosoRef.current?.scrollIntoView({ index: activeRowIndex, behavior: 'smooth' });
  }, [activeTabUid, activeRowIndex]);

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

      <div className="collections-list">
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: '100%' }}
          data={rows}
          computeItemKey={(index, row) => row.id}
          defaultItemHeight={26}
          increaseViewportBy={{ top: 400, bottom: 600 }}
          itemContent={(index, row) => (
            <SidebarRow
              row={row}
              searchText={searchText}
              itemsByUid={itemsByUid}
              collectionsByUid={collectionsByUid}
              ghostsByPath={ghostsByPath}
            />
          )}
        />
      </div>
    </StyledWrapper>
  );
};

export default Collections;
