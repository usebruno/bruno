import React from 'react';
import CollectionRow from '../Collection/CollectionRow';
import CollectionItemRow from '../Collection/CollectionItem/CollectionItemRow';
import GitRemoteCollectionRow from '../GitRemoteCollectionRow';
import ExampleItem from '../Collection/CollectionItem/ExampleItem';
import EmptyCtaRow from './EmptyCtaRow';

// Resolve the live object for a row in O(1). Reference equality is used by
// the memo comparator to avoid re-rendering unchanged rows.
const resolveRowObject = ({ row, itemsByUid, collectionsByUid, ghostsByPath }) => {
  switch (row.kind) {
    case 'collection':
    case 'empty-cta':
      // collection header and collection-root empty-cta both key off collectionUid
      return collectionsByUid.get(row.collectionUid);
    case 'folder':
    case 'app':
    case 'request':
    case 'example':
      // example rows resolve to their parent request. its examples array carries the content
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
    case 'example': {
      const item = itemsByUid.get(row.itemUid);
      const collection = collectionsByUid.get(row.collectionUid);
      const example = item?.examples?.[row.exampleIndex];
      if (!item || !collection || !example) return null;
      return <ExampleItem example={example} item={item} collection={collection} depth={row.depth} />;
    }
    default:
      return null;
  }
};

const SidebarRow = (props) => {
  const { row } = props;
  const inner = renderRow(props);
  if (inner === null) return null;
  return (
    <div
      data-collection-id={row.collectionId || undefined}
      data-collection-uid={row.collectionUid || undefined}
      data-parent-name={row.parentName || undefined}
    >
      {inner}
    </div>
  );
};

// Compare row values instead of prop identity because flattening creates
// new row objects on every rebuild. Only re-render when the row's structural
// values, search text, or resolved object reference changes.
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
