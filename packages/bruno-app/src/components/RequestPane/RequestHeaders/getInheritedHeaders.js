import get from 'lodash/get';
import { getTreePathFromCollectionToItem } from 'utils/collections';

// Sources ordered by precedence: nearest folder first, collection last.
export const getInheritedHeaderSources = (collection, item) => {
  const treePath = getTreePathFromCollectionToItem(collection, item);
  const folders = treePath.filter((treeItem) => treeItem.type === 'folder').reverse();

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

// All inherited headers are listed, so a name defined at several levels resolves
// to the nearest enabled value. Within one source the last definition wins.
export const getInheritedHeaders = (collection, item) => {
  const claimedNames = new Set();

  return getInheritedHeaderSources(collection, item).flatMap(({ headers, ...source }) => {
    const effectiveHeaders = new Map();

    headers.forEach((header) => {
      const normalizedName = header.name?.toLowerCase();
      if (!header.enabled || !normalizedName || claimedNames.has(normalizedName)) {
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

    effectiveHeaders.forEach((_, normalizedName) => claimedNames.add(normalizedName));

    return Array.from(effectiveHeaders.values());
  });
};
