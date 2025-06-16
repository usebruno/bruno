import { get } from 'lodash';
import {
  findItemInCollection,
  findParentItemInCollection
} from 'utils/collections';

export const getTreePathFromCollectionToItem = (collection, _itemUid) => {
  let path = [];
  let item = findItemInCollection(collection, _itemUid);
  while (item) {
    path.unshift(item);
    item = findParentItemInCollection(collection, item?.uid);
  }
  return path;
};

// Resolve inherited auth by traversing up the folder hierarchy
export const resolveInheritedAuth = (item, collection) => {
  const request = item.draft?.request || item.request;
  const authMode = request?.auth?.mode;

  // If auth is not inherit or no auth defined, return the request as is
  if (!authMode || authMode !== 'inherit') {
    return request;
  }

  // Get the tree path from collection to item
  const requestTreePath = getTreePathFromCollectionToItem(collection, item.uid);

  // Default to collection auth
  const collectionAuth = get(collection, 'root.request.auth', { mode: 'none' });
  let effectiveAuth = collectionAuth;

  // Check folders in reverse to find the closest auth configuration
  for (let i of [...requestTreePath].reverse()) {
    if (i.type === 'folder') {
      const folderAuth = get(i, 'root.request.auth');
      if (folderAuth && folderAuth.mode && folderAuth.mode !== 'none' && folderAuth.mode !== 'inherit') {
        effectiveAuth = folderAuth;
        break;
      }
    }
  }

  return {
    ...request,
    auth: effectiveAuth
  };
}; 