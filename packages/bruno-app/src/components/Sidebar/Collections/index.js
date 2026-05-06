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
        {sidebarEntries.map((entry) => {
          if (entry.kind === 'loaded') {
            return <Collection searchText={searchText} collection={entry.collection} key={entry.key} />;
          }
          return <GitRemoteCollectionRow entry={entry.entry} key={entry.key} />;
        })}
      </div>
    </StyledWrapper>
  );
};

export default Collections;
