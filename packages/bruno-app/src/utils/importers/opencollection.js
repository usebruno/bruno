import each from 'lodash/each';
import { uuid } from 'utils/common';
import { BrunoError } from 'utils/common/error';
import { validateSchema, updateUidsInCollection, hydrateSeqInCollection } from './common';
import { transformExampleStatusInCollection } from '@usebruno/common';
import { openCollectionToBruno } from '@usebruno/converters';

const addUidsToRoot = (collection) => {
  if (collection.root?.request?.headers) {
    each(collection.root.request.headers, (header) => {
      header.uid = uuid();
    });
  }
  if (collection.root?.request?.vars?.req) {
    each(collection.root.request.vars.req, (v) => {
      v.uid = uuid();
    });
  }
  if (collection.root?.request?.vars?.res) {
    each(collection.root.request.vars.res, (v) => {
      v.uid = uuid();
    });
  }

  const addUidsToFolderRoot = (items) => {
    each(items, (item) => {
      if (item.type === 'folder') {
        if (item.root?.request?.headers) {
          each(item.root.request.headers, (header) => {
            header.uid = uuid();
          });
        }
        if (item.root?.request?.vars?.req) {
          each(item.root.request.vars.req, (v) => {
            v.uid = uuid();
          });
        }
        if (item.root?.request?.vars?.res) {
          each(item.root.request.vars.res, (v) => {
            v.uid = uuid();
          });
        }
        if (item.items?.length) {
          addUidsToFolderRoot(item.items);
        }
      }
    });
  };

  addUidsToFolderRoot(collection.items);
  return collection;
};

export const processOpenCollection = async (jsonData) => {
  try {
    let collection = openCollectionToBruno(jsonData);
    collection = hydrateSeqInCollection(collection);
    collection = updateUidsInCollection(collection);
    collection = addUidsToRoot(collection);
    collection = transformExampleStatusInCollection(collection);
    await validateSchema(collection);
    return collection;
  } catch (err) {
    console.error('Error processing OpenCollection:', err);
    throw new BrunoError('Import OpenCollection failed');
  }
};

export const isOpenCollection = (data) => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  if (typeof data.opencollection !== 'string' || !data.opencollection.trim()) {
    return false;
  }

  if (typeof data.info !== 'object' || data.info === null) {
    return false;
  }

  return true;
};
