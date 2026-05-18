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
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);

  // Default to collection auth
  const collectionRoot = collection?.draft?.root || collection?.root || {};
  const collectionAuth = get(collectionRoot, 'request.auth', { mode: 'none' });
  let effectiveAuth = collectionAuth;

  // Check folders in reverse to find the closest auth configuration
  for (let i of [...requestTreePath].reverse()) {
    if (i.type === 'folder') {
      const folderAuth = i?.draft ? get(i, 'draft.request.auth') : get(i, 'root.request.auth');
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

export const getEffectiveAuthSource = (collection, item) => {
  const authMode = item?.draft
    ? get(item, 'draft.request.auth.mode')
    : (get(item, 'request.auth.mode') ?? get(item, 'root.request.auth.mode'));
  if (authMode !== 'inherit') return null;

  const collectionRoot = collection?.draft?.root || collection?.root || {};
  const collectionAuth = get(collectionRoot, 'request.auth');
  let effectiveSource = {
    type: 'collection',
    name: 'Collection',
    auth: collectionAuth
  };

  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  for (let i of [...requestTreePath].reverse()) {
    if (i?.uid === item?.uid) continue;
    if (i?.type !== 'folder') continue;
    const folderAuth = get(i, 'root.request.auth');
    if (folderAuth && folderAuth.mode && folderAuth.mode !== 'inherit') {
      effectiveSource = {
        type: 'folder',
        name: i.name,
        auth: folderAuth
      };
      break;
    }
  }

  return effectiveSource;
};
