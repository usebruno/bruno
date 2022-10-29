import each from 'lodash/each';
import get from 'lodash/get';
import fileDialog from 'file-dialog';
import cloneDeep from 'lodash/cloneDeep';
import { uuid } from 'utils/common';
import { collectionSchema } from '@usebruno/schema';
import { saveCollectionToIdb } from 'utils/idb';
import { BrunoError } from 'utils/common/error';
import sampleCollection from './samples/sample-collection.json';

const readFile = (files) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => resolve(e.target.result);
    fileReader.onerror = (err) => reject(err);
    fileReader.readAsText(files[0]);
  });
};

const parseJsonCollection = (str) => {
  return new Promise((resolve, reject) => {
    try {
      let parsed = JSON.parse(str);
      return resolve(parsed);
    } catch (err) {
      console.log(err);
      reject(new BrunoError('Unable to parse the collection json file'));
    }
  });
};

const validateSchema = (collection = {}) => {
  return new Promise((resolve, reject) => {
    collectionSchema
      .validate(collection)
      .then(() => resolve(collection))
      .catch((err) => {
        console.log(err);
        reject(new BrunoError('The Collection file is corrupted'));
      });
  });
};

const updateUidsInCollection = (_collection) => {
  const collection = cloneDeep(_collection);

  collection.uid = uuid();

  const updateItemUids = (items = []) => {
    each(items, (item) => {
      item.uid = uuid();

      each(get(item, 'request.headers'), (header) => (header.uid = uuid()));
      each(get(item, 'request.params'), (param) => (param.uid = uuid()));
      each(get(item, 'request.body.multipartForm'), (param) => (param.uid = uuid()));
      each(get(item, 'request.body.formUrlEncoded'), (param) => (param.uid = uuid()));

      if (item.items && item.items.length) {
        updateItemUids(item.items);
      }
    });
  };
  updateItemUids(collection.items);

  return collection;
};

const importCollection = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ accept: 'application/json' })
      .then(readFile)
      .then(parseJsonCollection)
      .then(validateSchema)
      .then(updateUidsInCollection)
      .then(validateSchema)
      .then((collection) => saveCollectionToIdb(window.__idb, collection))
      .then((collection) => resolve(collection))
      .catch((err) => {
        console.log(err);
        reject(new BrunoError('Import collection failed'));
      });
  });
};

export const importSampleCollection = () => {
  return new Promise((resolve, reject) => {
    validateSchema(sampleCollection)
      .then(updateUidsInCollection)
      .then(validateSchema)
      .then((collection) => saveCollectionToIdb(window.__idb, collection))
      .then(resolve)
      .catch(reject);
  });
};

export default importCollection;
