import React from 'react';
import CollectionRow from '../Collection/CollectionRow';
import CollectionItemRow from '../Collection/CollectionItem/CollectionItemRow';
import GitRemoteCollectionRow from '../GitRemoteCollectionRow';
import ExampleItem from '../Collection/CollectionItem/ExampleItem';
import EmptyCtaRow from './EmptyCtaRow';

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
      // example rows resolve to their parent request.
      return itemsByUid.get(row.itemUid);
    case 'ghost':
      return ghostsByPath.get(row.collectionPathname);
    default:
      return undefined;
  }
};

const renderRow = (props) => {
  const { row, searchText, openBulkMenu, collectionsByUid } = props;
  const resolved = resolveRowObject(props);

  switch (row.kind) {
    case 'collection': {
      if (!resolved) return null;
      return <CollectionRow collection={resolved} searchText={searchText} openBulkMenu={openBulkMenu} />;
    }
    case 'folder':
    case 'app':
    case 'request': {
      if (!resolved) return null;
      return (
        <CollectionItemRow
          item={resolved}
          depth={row.depth}
          collectionUid={row.collectionUid}
          collectionPathname={row.collectionPathname}
          searchText={searchText}
          openBulkMenu={openBulkMenu}
        />
      );
    }
    case 'empty-cta': {
      return <EmptyCtaRow collection={resolved} itemUid={row.itemUid} depth={row.depth} />;
    }
    case 'ghost': {
      if (!resolved) return null;
      return <GitRemoteCollectionRow entry={resolved} />;
    }
    case 'example': {
      const item = resolved;
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
      data-sidebar-row
      data-collection-id={row.collectionId || undefined}
      data-collection-uid={row.collectionUid || undefined}
      data-parent-name={row.parentName || undefined}
    >
      {inner}
    </div>
  );
};

// Compare row values instead of object identity because flattening creates new row objects
// on every rebuild.
const areEqual = (prev, next) => {
  const a = prev.row;
  const b = next.row;
  return (
    a.kind === b.kind
    && a.id === b.id
    && a.depth === b.depth
    && a.itemUid === b.itemUid
    && a.collectionUid === b.collectionUid
    && a.collectionId === b.collectionId
    && a.parentName === b.parentName
    && a.collectionPathname === b.collectionPathname
    && a.exampleIndex === b.exampleIndex
    && prev.searchText === next.searchText
    && resolveRowObject(prev) === resolveRowObject(next)
  );
};

export default React.memo(SidebarRow, areEqual);
