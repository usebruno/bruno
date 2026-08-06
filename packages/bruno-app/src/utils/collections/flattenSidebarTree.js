import { isItemAFolder, isItemARequest } from './index';
import { sortByNameThenSequence } from 'utils/common/index';
import {
  doesRequestMatchSearchText,
  doesFolderHaveItemsMatchSearchText,
  doesCollectionHaveItemsMatchingSearchText
} from './search';

const sortBySeq = (items) => [...items].sort((a, b) => a.seq - b.seq);

// Stable, name-derived id for a collection. Matches the `#collection-<slug>` id CollectionRow
// renders, and lets tests scope rows to a collection without relying on DOM nesting.
const slugifyCollectionName = (name) => (name || '').replace(/\s+/g, '-').toLowerCase();

const groupCollectionItems = (collectionItems) => {
  const folders = [], apps = [], requests = [];

  for (const item of collectionItems) {
    if (!item || item.isTransient) continue;

    if (isItemAFolder(item)) {
      folders.push(item);
    } else if (item.type === 'app') {
      apps.push(item);
    } else if (isItemARequest(item)) {
      requests.push(item);
    }
  }

  return {
    folders: sortByNameThenSequence(folders),
    apps: sortBySeq(apps),
    requests: sortBySeq(requests)
  };
};

/**
 * Walk the children of a collection or folder and emit them as flat sidebar rows.
 * Folders are recursively traversed when expanded.
 *
 * Returns the number of visible persisted children, used to determine whether
 * an empty-state CTA should be shown.
 */
const walkChildren = ({ collectionItems = [], depth, collectionUid, collectionPathname, collectionId, parentName, hasSearch, searchText, appendRow, addItemToIndex }) => {
  let visibleChildCount = 0;

  const { folders, apps, requests } = groupCollectionItems(collectionItems);

  for (const folder of folders) {
    if (hasSearch && !doesFolderHaveItemsMatchSearchText(folder, searchText)) continue;
    visibleChildCount++;

    appendRow({
      id: `${collectionUid}:${folder.uid}`,
      kind: 'folder',
      depth,
      collectionUid,
      collectionPathname,
      collectionId,
      parentName,
      itemUid: folder.uid,
      sortName: folder.name || null
    });
    addItemToIndex(folder.uid, folder);

    const isExpanded = hasSearch || !folder.collapsed;
    if (!isExpanded) continue;

    const childCount = walkChildren({ collectionItems: folder.items, depth: depth + 1, collectionUid, collectionPathname, collectionId, parentName: folder.name || null, hasSearch, searchText, appendRow, addItemToIndex });

    if (!hasSearch && childCount === 0) {
      appendRow({
        id: `${collectionUid}:${folder.uid}:cta`,
        kind: 'empty-cta',
        depth: depth + 1,
        collectionUid,
        collectionPathname,
        collectionId,
        parentName: folder.name || null,
        itemUid: folder.uid,
        sortName: null
      });
    }
  }

  // apps — never match a request-name search, so hidden while searching
  if (!hasSearch) {
    for (const app of apps) {
      visibleChildCount++;
      appendRow({
        id: `${collectionUid}:${app.uid}`,
        kind: 'app',
        depth,
        collectionUid,
        collectionPathname,
        collectionId,
        parentName,
        itemUid: app.uid,
        sortName: app.name || null
      });
      addItemToIndex(app.uid, app);
    }
  }

  // requests — plus their response examples when expanded (and not searching)
  for (const request of requests) {
    if (hasSearch && !doesRequestMatchSearchText(request, searchText)) continue;
    visibleChildCount++;

    appendRow({
      id: `${collectionUid}:${request.uid}`,
      kind: 'request',
      depth,
      collectionUid,
      collectionPathname,
      collectionId,
      parentName,
      itemUid: request.uid,
      sortName: request.name || null
    });
    addItemToIndex(request.uid, request);

    const isHttpRequestWithExamples = request.type === 'http-request' && Array.isArray(request.examples);
    if (!hasSearch && isHttpRequestWithExamples && request.examplesExpanded) {
      request.examples.forEach((example, index) => {
        appendRow({
          id: `${collectionUid}:${request.uid}:ex:${example.uid || index}`,
          kind: 'example',
          depth: depth + 1,
          collectionUid,
          collectionPathname,
          collectionId,
          parentName: request.name || null,
          itemUid: request.uid,
          sortName: example.name || null,
          exampleIndex: index,
          exampleUid: example.uid || null
        });
      });
    }
  }

  return visibleChildCount;
};

/**
  * Emit a collection row and flatten its visible children into sidebar rows.
  * Recursively walks the collection tree when expanded and adds an empty-state CTA when needed.
  */
const flattenCollection = ({ collection, hasSearch, searchText, appendRow, addItemToIndex, addCollectionToIndex }) => {
  // if searching, skip collections that don't have any matching items
  if (hasSearch && !doesCollectionHaveItemsMatchingSearchText(collection, searchText)) {
    return;
  }

  const collectionId = slugifyCollectionName(collection.name);

  appendRow({
    id: `col:${collection.uid}`,
    kind: 'collection',
    depth: 0,
    collectionUid: collection.uid,
    collectionPathname: collection.pathname || null,
    collectionId,
    parentName: null,
    itemUid: null,
    sortName: collection.name || null
  });
  addCollectionToIndex(collection.uid, collection);

  const isExpanded = hasSearch || !collection.collapsed;

  if (!isExpanded) return;

  const visibleChildCount = walkChildren({ collectionItems: collection.items,
    depth: 1,
    collectionUid: collection.uid,
    collectionPathname: collection.pathname || null,
    collectionId,
    parentName: null,
    hasSearch,
    searchText,
    appendRow,
    addItemToIndex
  });

  // empty-state CTA.
  if (!hasSearch && visibleChildCount === 0 && collection.mountStatus === 'mounted' && !collection.isLoading) {
    appendRow({
      id: `${collection.uid}:root:cta`,
      kind: 'empty-cta',
      depth: 1,
      collectionUid: collection.uid,
      collectionPathname: collection.pathname || null,
      collectionId,
      parentName: null,
      itemUid: null,
      sortName: null
    });
  }
};

/**
 * convert sidebar entries into a flat, ordered array of layout rows.
 * each row carry only structural data (id/kind/depth/uids).
 *
 * @param {Array} sidebarEntries  { kind:'loaded', collection } | { kind:'ghost', entry }
 * @param {{ searchText?: string }} [options]
 * @returns {{ rows: Array<Object>, itemsByUid: Map, collectionsByUid: Map }}
 *   rows             — the flat, ordered layout rows (structural data only)
 *   itemsByUid       — uid -> reference to the live folder/app/request object in the Redux store.
 *   collectionsByUid — uid -> reference to the live collection object in the Redux store.
 *
 * itemsByUid / collectionsByUid hold references (not copies) into the Redux tree and are
 * rebuilt on every call, so they never drift from the source of truth.
 */
export const flattenSidebarTree = (sidebarEntries = [], options = {}) => {
  const { searchText = '' } = options;
  const hasSearch = !!(searchText && searchText.trim().length);

  const rows = [];
  const itemsByUid = new Map();
  const collectionsByUid = new Map();
  const appendRow = (row) => rows.push(row);
  const addItemToIndex = (uid, item) => itemsByUid.set(uid, item);
  const addCollectionToIndex = (uid, collection) => collectionsByUid.set(uid, collection);

  for (const entry of sidebarEntries) {
    if (!entry) continue;

    // Git-backed collection whose local folder is missing — a single, non-recursive row.
    if (entry.kind === 'ghost') {
      const g = entry.entry || {};
      appendRow({
        id: `ghost:${g.path}`,
        kind: 'ghost',
        depth: 0,
        collectionUid: null,
        collectionPathname: g.path || null,
        itemUid: null,
        sortName: g.name || null
      });
      continue;
    }

    if (!entry.collection) continue;
    flattenCollection({ collection: entry.collection, hasSearch, searchText, appendRow, addItemToIndex, addCollectionToIndex });
  }

  return { rows, itemsByUid, collectionsByUid };
};

/**
 * item-uid and collection-uid to index lookup. maps over a rows array, so features
 * like scroll-to-active-tab and keyboard nav can resolve a row's position in O(1).
 *
 * @param {Array<Object>} rows
 * @returns {{ rowIndexByItemUid: Map, rowIndexByCollectionUid: Map }}
 */
export const buildIndexes = (rows = []) => {
  const rowIndexByItemUid = new Map();

  // collection active tab have collection uid not the itemId.
  const rowIndexByCollectionUid = new Map();

  rows.forEach((row, index) => {
    if (row.kind === 'collection' && row.collectionUid) {
      rowIndexByCollectionUid.set(row.collectionUid, index);
    }

    // folders, apps, and requests are addressable by their itemUid
    // empty-cta rows share the parent uid.
    if ((['folder', 'app', 'request'].includes(row.kind)) && row.itemUid) {
      rowIndexByItemUid.set(row.itemUid, index);
    }

    // Example rows are addressable by their exampleUid
    if (row.kind === 'example' && row.exampleUid) {
      rowIndexByItemUid.set(row.exampleUid, index);
    }
  });

  return { rowIndexByItemUid, rowIndexByCollectionUid };
};
