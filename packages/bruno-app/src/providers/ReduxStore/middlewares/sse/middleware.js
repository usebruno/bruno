import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { createSseMerger, getSseStorageKey } from 'utils/response/sse';
import { appSetRuntimeVariable } from '../../slices/collections';

// Stream completion must also extract variables when another request or tab is open.
export const sseMiddleware = ({ getState, dispatch }) => (next) => (action) => {
  let collection;
  let item;
  if (action.type === 'collections/requestCancelled') {
    collection = findCollectionByUid(getState().collections.collections, action.payload.collectionUid);
    item = collection && findItemInCollection(collection, action.payload.itemUid);
  }
  const result = next(action);
  if (!item?.response?.stream?.running) return result;

  try {
    const options = JSON.parse(localStorage.getItem(getSseStorageKey(item, collection)));
    if (options?.mode !== 'custom' || !options.saveVariables || !Array.isArray(options.rules)) return result;
    const merger = createSseMerger(options);
    item.response.data.forEach((message) => {
      if (message.type === 'incoming' && typeof message.message === 'string') merger.push(message.message);
    });
    const merged = merger.result();
    if (!merged.errors.some(Boolean)) {
      merged.fields.forEach((field) => {
        dispatch(appSetRuntimeVariable({ collectionUid: collection.uid, key: field.name, value: field.text }));
      });
    }
  } catch {
    // Ignore missing or invalid local extraction settings.
  }
  return result;
};
