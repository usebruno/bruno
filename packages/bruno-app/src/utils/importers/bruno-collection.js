import { BrunoError } from 'utils/common/error';
import { validateSchema, transformItemsInCollection, updateUidsInCollection, hydrateSeqInCollection } from './common';


export const processBrunoCollection = async (jsonData) => {
  try {
    let collection = hydrateSeqInCollection(jsonData);
    collection = updateUidsInCollection(collection);
    collection = transformItemsInCollection(collection);
    await validateSchema(collection);
    return collection;
  } catch (err) {
    console.error('Error processing Bruno collection:', err);
    throw new BrunoError('Import collection failed');
  }
};

export const isBrunoCollection = (data) => {
  // Check for Bruno collection format
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  // Must have a version field that is a non-empty string
  if (typeof data.version !== 'string' || !data.version.trim()) {
    return false;
  }

  // Must have a name field that is a non-empty string
  if (typeof data.name !== 'string' || !data.name.trim()) {
    return false;
  }

  // Must have an items array
  if (!Array.isArray(data.items)) {
    return false;
  }

  return true;
};
