import fileDialog from 'file-dialog';
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

export default importCollection;
