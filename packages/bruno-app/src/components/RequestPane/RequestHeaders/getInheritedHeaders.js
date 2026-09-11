import get from 'lodash/get';

const getAncestorFoldersForItem = (collection, item) => {
  const targetUid = item?.uid;
  if (!targetUid || !collection?.items) {
    return [];
  }

  const findFolders = (items, ancestors) => {
    for (const treeItem of items) {
      if (treeItem.uid === targetUid) {
        return treeItem.type === 'folder' ? [...ancestors, treeItem] : ancestors;
      }
      if (treeItem.items?.length) {
        const nextAncestors = treeItem.type === 'folder' ? [...ancestors, treeItem] : ancestors;
        const found = findFolders(treeItem.items, nextAncestors);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  return findFolders(collection.items, []) ?? [];
};

// Sources ordered by precedence: nearest folder first, collection last.
export const getInheritedHeaderSources = (collection, item) => {
  const folders = getAncestorFoldersForItem(collection, item).reverse();

  return [
    ...folders.map((folder) => ({
      type: 'folder',
      uid: folder.uid,
      name: folder.name,
      headers: folder.draft
        ? get(folder, 'draft.request.headers', [])
        : get(folder, 'root.request.headers', [])
    })),
    {
      type: 'collection',
      uid: collection.uid,
      name: collection.name,
      headers: collection.draft?.root
        ? get(collection, 'draft.root.request.headers', [])
        : get(collection, 'root.request.headers', [])
    }
  ];
};

// Nearest enabled value wins. `claimedNames` hides names enabled on the request.
export const getInheritedHeaders = (collection, item, claimedNames) => {
  const claimed = new Set(
    claimedNames ? [...claimedNames].map((name) => String(name).toLowerCase()) : []
  );

  return getInheritedHeaderSources(collection, item).flatMap(({ headers, ...source }) => {
    const effectiveHeaders = new Map();

    headers.forEach((header) => {
      const normalizedName = header.name?.toLowerCase();
      if (!header.enabled || !normalizedName || claimed.has(normalizedName)) {
        return;
      }

      effectiveHeaders.set(normalizedName, {
        ...header,
        uid: `inherited-${source.type}-${source.uid}-${header.uid}`,
        sourceRowUid: header.uid,
        rowType: 'inherited',
        source
      });
    });

    effectiveHeaders.forEach((_, normalizedName) => claimed.add(normalizedName));

    return Array.from(effectiveHeaders.values());
  });
};

export const filterUnclaimedHeaders = (headers, claimedNames) => {
  const claimed = new Set(
    claimedNames ? [...claimedNames].map((name) => String(name).toLowerCase()) : []
  );

  return headers.filter((header) => {
    const normalizedName = header.name?.toLowerCase();
    return normalizedName && !claimed.has(normalizedName);
  });
};
