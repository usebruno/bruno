import { isItemAFolder, isItemARequest } from './index';
import { sortByNameThenSequence } from 'utils/common/index';
import {
  doesRequestMatchSearchText,
  doesFolderHaveItemsMatchSearchText,
  doesCollectionHaveItemsMatchingSearchText
} from './search';

const groupCollectionItems = (collectionItems) => {
  const folders = [];
  const apps = [];
  const requests = [];

  const sortBySeq = (items) => [...items].sort((a, b) => a.seq - b.seq);

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
 * Flattens the children of a collection or folder into sidebar rows.
 * Returns the number of visible children to determine whether an empty-state
 * CTA should be shown.
 */
const walkChildren = (
  collectionContext,
  { collectionItems = [], depth, parentName }
) => {
  const {
    collectionUid,
    collectionPathname,
    collectionId,
    hasSearch,
    searchText,
    appendRow,
    addItemToIndex
  } = collectionContext;

  let visibleChildCount = 0;

  const { folders, apps, requests } = groupCollectionItems(collectionItems);

  for (const folder of folders) {
    if (hasSearch && !doesFolderHaveItemsMatchSearchText(folder, searchText)) {
      continue;
    }

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

    // Search reveals matching descendants regardless of the collapsed state.
    const isExpanded = hasSearch || !folder.collapsed;

    if (!isExpanded) continue;

    const childCount = walkChildren(collectionContext, {
      collectionItems: folder.items,
      depth: depth + 1,
      parentName: folder.name || null
    });

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

  for (const request of requests) {
    if (hasSearch && !doesRequestMatchSearchText(request, searchText)) {
      continue;
    }

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

    const hasExamples
      = request.type === 'http-request' && Array.isArray(request.examples);

    if (!hasSearch && hasExamples && request.examplesExpanded) {
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
 * Adds a collection and its visible children to the flat sidebar row list.
 */
const flattenCollection = ({
  collection,
  hasSearch,
  searchText,
  appendRow,
  addItemToIndex,
  addCollectionToIndex
}) => {
  if (
    hasSearch
    && !doesCollectionHaveItemsMatchingSearchText(collection, searchText)
  ) {
    return;
  }

  // Used for readable test selectors. collectionUid remains the unique identity.
  const slugifyCollectionName = (name) =>
    (name || '').replace(/\s+/g, '-').toLowerCase();

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

  // Search reveals matching descendants regardless of the collapsed state.
  const isExpanded = hasSearch || !collection.collapsed;

  if (!isExpanded) return;

  const collectionContext = {
    collectionUid: collection.uid,
    collectionPathname: collection.pathname || null,
    collectionId,
    hasSearch,
    searchText,
    appendRow,
    addItemToIndex
  };

  const visibleChildCount = walkChildren(collectionContext, {
    collectionItems: collection.items,
    depth: 1,
    parentName: null
  });

  // append emtry row cta.
  if (
    !hasSearch
    && visibleChildCount === 0
    && collection.mountStatus === 'mounted'
    && !collection.isLoading
  ) {
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
 * Converts sidebar entries into a flat, ordered array of layout rows.
 *
 * Each row contains only structural data needed to render the sidebar.
 *
 * @param {Array} sidebarEntries
 * @param {{ searchText?: string }} options
 * @returns {{
 *   rows: Array<Object>,
 *   itemsByUid: Map,
 *   collectionsByUid: Map
 * }}
 */
export const flattenSidebarTree = (sidebarEntries = [], options = {}) => {
  const { searchText = '' } = options;
  const hasSearch = Boolean(searchText.trim());

  const rows = [];
  const itemsByUid = new Map();
  const collectionsByUid = new Map();

  const appendRow = (row) => rows.push(row);
  const addItemToIndex = (uid, item) => itemsByUid.set(uid, item);
  const addCollectionToIndex = (uid, collection) =>
    collectionsByUid.set(uid, collection);

  for (const entry of sidebarEntries) {
    if (!entry) continue;

    // A ghost represents a missing Git-backed collection and is never expanded.
    if (entry.kind === 'ghost') {
      const ghost = entry.entry || {};

      appendRow({
        id: `ghost:${ghost.path}`,
        kind: 'ghost',
        depth: 0,
        collectionUid: null,
        collectionPathname: ghost.path || null,
        itemUid: null,
        sortName: ghost.name || null
      });

      continue;
    }

    if (!entry.collection) continue;

    flattenCollection({
      collection: entry.collection,
      hasSearch,
      searchText,
      appendRow,
      addItemToIndex,
      addCollectionToIndex
    });
  }

  return {
    rows,
    itemsByUid,
    collectionsByUid
  };
};

/**
 * Builds O(1) lookups from item/collection UIDs to their row positions.
 * needed for active tab to scroll into view in sidebar
 */
export const buildIndexes = (rows = []) => {
  const rowIndexByItemUid = new Map();
  const rowIndexByCollectionUid = new Map();

  rows.forEach((row, index) => {
    if (row.kind === 'collection' && row.collectionUid) {
      rowIndexByCollectionUid.set(row.collectionUid, index);
    }

    if (
      ['folder', 'app', 'request'].includes(row.kind)
      && row.itemUid
    ) {
      rowIndexByItemUid.set(row.itemUid, index);
    }

    if (row.kind === 'example' && row.exampleUid) {
      rowIndexByItemUid.set(row.exampleUid, index);
    }
  });

  return {
    rowIndexByItemUid,
    rowIndexByCollectionUid
  };
};
