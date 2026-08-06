import React from 'react';
import CollectionRow from '../Collection/CollectionRow';
import CollectionItemRow from '../Collection/CollectionItem/CollectionItemRow';
import GitRemoteCollectionRow from '../GitRemoteCollectionRow';
import EmptyCtaRow from './EmptyCtaRow';

// Resolve, in O(1), the live object a row points at - from the maps the flattener produced.
// Kept identical between renders so the memo comparator below can compare it by reference.
const resolveRowObject = ({ row, itemsByUid, collectionsByUid, ghostsByPath }) => {
  switch (row.kind) {
    case 'collection':
    case 'empty-cta':
      // collection header and collection-root empty-cta both key off collectionUid
      return collectionsByUid.get(row.collectionUid);
    case 'folder':
    case 'app':
    case 'request':
      return itemsByUid.get(row.itemUid);
    case 'ghost':
      return ghostsByPath.get(row.collectionPathname);
    default:
      return undefined;
  }
};

const renderRow = ({ row, searchText, itemsByUid, collectionsByUid, ghostsByPath }) => {
  switch (row.kind) {
    case 'collection': {
      const collection = collectionsByUid.get(row.collectionUid);
      if (!collection) return null;
      return <CollectionRow collection={collection} searchText={searchText} />;
    }
    case 'folder':
    case 'app':
    case 'request': {
      const item = itemsByUid.get(row.itemUid);
      if (!item) return null;
      return (
        <CollectionItemRow
          item={item}
          collectionUid={row.collectionUid}
          collectionPathname={row.collectionPathname}
          searchText={searchText}
          depth={row.depth}
        />
      );
    }
    case 'empty-cta': {
      const collection = collectionsByUid.get(row.collectionUid);
      return <EmptyCtaRow collection={collection} itemUid={row.itemUid} depth={row.depth} />;
    }
    case 'ghost': {
      const entry = ghostsByPath.get(row.collectionPathname);
      if (!entry) return null;
      return <GitRemoteCollectionRow entry={entry} />;
    }
    // 'example' rows arrive in Phase 3 (examples currently render in-row); ignore for now.
    default:
      return null;
  }
};

/**
 * A single flat sidebar row. The wrapper carries ancestry as data-attrs (collection slug +
 * parent folder name) so callers can scope a row to its collection/folder without relying on
 * DOM nesting — which the flat list no longer provides.
 */
const SidebarRow = (props) => {
  const { row } = props;
  const inner = renderRow(props);
  if (inner === null) return null;
  return (
    <div data-collection-id={row.collectionId || undefined} data-parent-name={row.parentName || undefined}>
      {inner}
    </div>
  );
};

// Value-based comparison. A fresh flatten rebuilds the row wrappers and the resolver maps
// every time, so comparing prop identity would re-render every row. Instead compare the
// fields that actually drive rendering: the row's structural values, searchText, and the
// resolved object reference (which Redux/immer changes only for the row that actually changed).
const areEqual = (prev, next) => {
  const a = prev.row;
  const b = next.row;
  return (
    a.kind === b.kind
    && a.id === b.id
    && a.depth === b.depth
    && a.itemUid === b.itemUid
    && a.collectionUid === b.collectionUid
    && prev.searchText === next.searchText
    && resolveRowObject(prev) === resolveRowObject(next)
  );
};

export default React.memo(SidebarRow, areEqual);
