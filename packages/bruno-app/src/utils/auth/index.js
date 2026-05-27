import { get } from 'lodash';
import {
  getTreePathFromCollectionToItem
} from 'utils/collections/index';
import { AUTH_MODES } from 'utils/common/constants';

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

  // Walk ancestor folders from deepest up; pick the first one with a concrete auth mode (skip 'none'/'inherit').
  for (let idx = requestTreePath.length - 1; idx >= 0; idx--) {
    const i = requestTreePath[idx];
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
  console.log('eeeeeee');
  const authMode = item?.draft
    ? get(item, 'draft.request.auth.mode')
    : (get(item, 'request.auth.mode') ?? get(item, 'root.request.auth.mode'));
  if (authMode !== AUTH_MODES.INHERIT) return null;

  const collectionRoot = collection?.draft?.root || collection?.root || {};
  const collectionAuth = get(collectionRoot, 'request.auth');
  let effectiveSource = {
    type: 'collection',
    name: 'Collection',
    auth: collectionAuth
  };

  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  for (let idx = requestTreePath.length - 1; idx >= 0; idx--) {
    const i = requestTreePath[idx];
    if (i?.uid === item?.uid) continue;
    if (i?.type !== 'folder') continue;
    const folderAuth = get(i, 'root.request.auth');
    const folderMode = folderAuth?.mode || AUTH_MODES.NONE;
    if (folderMode === AUTH_MODES.INHERIT) continue;
    effectiveSource = {
      type: 'folder',
      name: i.name,
      auth: folderAuth ?? { mode: AUTH_MODES.NONE }
    };
    break;
  }

  return effectiveSource;
};

// Returns true when an item actually has auth applied — resolves `inherit` up
// the chain, then checks that the effective mode is set, not 'none', and (if a
// supportedModes list is passed) is one the protocol can apply.
export const hasEffectiveAuth = (collection, item, supportedModes) => {
  console.log('dddd');
  const auth = item?.draft
    ? get(item, 'draft.request.auth')
    : (get(item, 'request.auth') ?? get(item, 'root.request.auth'));
  const mode = auth?.mode === AUTH_MODES.INHERIT
    ? getEffectiveAuthSource(collection, item)?.auth?.mode
    : auth?.mode;
  if (!mode || mode === AUTH_MODES.NONE) return false;
  if (supportedModes && !supportedModes.includes(mode)) return false;
  return true;
};
