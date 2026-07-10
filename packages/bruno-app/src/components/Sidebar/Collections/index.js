import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Collection from './Collection';
import GitRemoteCollectionRow from './GitRemoteCollectionRow';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import InlineCollectionCreator from './InlineCollectionCreator';
import path, { normalizePath } from 'utils/common/path';
import { isScratchCollection } from 'utils/collections';
import { Virtuoso } from 'react-virtuoso';
import { flattenSidebar } from 'utils/collections/flatten';

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

  // Flatten the entries
  const flattenedItems = useMemo(() => {
    return flattenSidebar(sidebarEntries, searchText);
  }, [sidebarEntries, searchText]);

  const renderItem = (index, item) => {
    switch (item.type) {
      case 'collection-root':
        return <Collection searchText={searchText} collection={item.collection} />;
      case 'ghost-collection':
        return <GitRemoteCollectionRow entry={item.entry} />;
      case 'collection-item':
        return <CollectionItem item={item.item} collectionUid={item.collectionUid} collectionPathname={item.collectionPathname} searchText={searchText} />;
      case 'empty-collection-message':
        return (
          <div className="empty-collection-message">
            <div className="indent-block" style={{ width: 16, minWidth: 16, height: '100%' }}>
              &nbsp;
            </div>
            <div style={{ paddingLeft: 8 }}>
              <button className="ml-1 add-request-link">+ Add request</button>
            </div>
          </div>
        );
      case 'empty-folder-message':
        // we can calculate indents from item.item.depth
        const indents = Array.from({ length: item.item.depth + 1 }).map((_, i) => i);
        return (
          <div className="empty-folder-message">
            {indents.map((i) => (
              <div className="indent-block" key={i} style={{ width: 16, minWidth: 16, height: '100%' }}>
                &nbsp;
              </div>
            ))}
            <div style={{ paddingLeft: 8 }}>
              <button className="ml-1 add-request-link">+ Add request</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <StyledWrapper data-testid="collections">
      {showSearch && (
        <CollectionSearch searchText={searchText} setSearchText={setSearchText} />
      )}

      <div className="collections-list">
        {isCreatingCollection && (
          <InlineCollectionCreator
            onComplete={onDismissCreate}
            onCancel={onDismissCreate}
            onOpenAdvanced={onOpenAdvancedCreate}
          />
        )}
        <Virtuoso
          data={flattenedItems}
          itemContent={renderItem}
          className="collections-list"
          style={{ flex: 1 }}
        />
      </div>
    </StyledWrapper>
  );
};

export default Collections;
