import { store } from 'providers/ReduxStore';
import { openLinkedRequest } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import { getRequestTypeFromCollectionPresets } from 'utils/collections';
import { formatIpcError } from 'utils/common/error';

const REQUEST_ITEM_TYPES = ['http-request', 'graphql-request', 'grpc-request', 'ws-request'];

/**
 * Handles clicking a URL inside a CodeMirror editor - opens it as a new transient
 * request. If we're inside a request tab, the new request matches that request's
 * type; otherwise (e.g. collection/folder settings) we fall back to the collection's
 * Presets type. Returns undefined with no collection, so Cmd/Ctrl+Click still opens
 * the link externally as usual.
 */
export function resolveLinkClickHandler(item, collection) {
  if (!collection?.uid) {
    return undefined;
  }

  const requestType = REQUEST_ITEM_TYPES.includes(item?.type)
    ? item.type
    : getRequestTypeFromCollectionPresets(collection);

  return (url) => {
    store.dispatch(openLinkedRequest({ url, collectionUid: collection.uid, requestType }))
      .catch((err) => toast.error(formatIpcError(err) || 'An error occurred while adding the request'));
  };
}
