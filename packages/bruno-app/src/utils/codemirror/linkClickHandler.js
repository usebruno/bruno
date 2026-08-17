import toast from 'react-hot-toast';
import { store } from 'providers/ReduxStore';
import { openLinkedRequest } from 'providers/ReduxStore/slices/collections/actions';
import { getRequestTypeFromCollectionPresets } from 'utils/collections';
import { formatIpcError } from 'utils/common/error';

const REQUEST_ITEM_TYPES = ['http-request', 'graphql-request', 'grpc-request', 'ws-request'];

/**
 * Builds the onLinkClick handler passed to setupLinkAware() (see utils/codemirror/linkAware.js)
 * so that clicking a URL inside a CodeMirror editor opens it as a new transient request in the
 * same collection:
 * - From inside an open request tab, the new request uses the same type as that request
 *   (HTTP -> HTTP, GraphQL -> GraphQL, gRPC -> gRPC, WS -> WS).
 * - From collection/folder settings (no request `item` in scope), the type comes from the
 *   collection's "Presets" settings, defaulting to HTTP.
 *
 * Returns undefined when there isn't enough context (no collection), so callers fall back to
 * the default Cmd/Ctrl+Click "open externally" behaviour.
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
