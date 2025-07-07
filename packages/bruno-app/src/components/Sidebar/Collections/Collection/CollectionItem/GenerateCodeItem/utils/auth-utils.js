import { get } from 'lodash';
import {
  getTreePathFromCollectionToItem
} from 'utils/collections/index';

// Resolve inherited auth by traversing up the folder hierarchy
export const resolveInheritedAuth = (item, collection) => {
  const mergedRequest = {
    ...(item.request || {}),
    ...(item.draft?.request || {})
  };

  const authMode = mergedRequest.auth.mode;

  // If auth is not inherit or no auth defined, return the merged request as is
  if (!authMode || authMode !== 'inherit') {
    return mergedRequest;
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
    ...mergedRequest,
    auth: effectiveAuth
  };
};