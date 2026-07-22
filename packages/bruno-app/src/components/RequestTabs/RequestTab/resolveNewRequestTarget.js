import { findParentItemInCollectionByPathname } from 'utils/collections';

const REQUEST_TAB_TYPES = ['request', 'http-request', 'graphql-request', 'grpc-request', 'ws-request'];

/**
 * Resolves where a new request should be created when Cmd/Ctrl+N is pressed
 * from the active request tab (sidebar folder/collection focus yields separately).
 *
 * @returns {{ collectionUid: string, item: object|null }|null}
 */
export const resolveNewRequestTarget = ({ tab, item, collection, folder }) => {
  if (!collection) {
    return null;
  }

  if (REQUEST_TAB_TYPES.includes(tab.type)) {
    const parentFolder = item?.pathname
      ? findParentItemInCollectionByPathname(collection, item.pathname)
      : null;
    return { collectionUid: collection.uid, item: parentFolder || null };
  }

  if (tab.type === 'folder-settings' && folder) {
    return { collectionUid: collection.uid, item: folder };
  }

  // collection-settings, overview, runner, variables, etc. → collection root
  return { collectionUid: collection.uid, item: null };
};
