import each from 'lodash/each';
import get from 'lodash/get';
import fileDialog from 'file-dialog';
import toast from 'react-hot-toast';
import { uuid } from 'utils/common';
import { collectionSchema } from '@usebruno/schema';
import { saveCollectionToIdb } from 'utils/idb';

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
      toast.error("Unable to parse the collection json file");
      reject(err);
    }
  });
};

const validateSchema = (collection = {}) => {
  collection.uid = uuid();
  return new Promise((resolve, reject) => {
    collectionSchema
      .validate(collection)
      .then(() => resolve(collection))
      .catch((err) => {
        toast.error("The Collection file is corrupted");
        reject(err);
      });
  });
};


const updateUidsInCollection = (collection) => {
  collection.uid = uuid();

  const updateItemUids = (items = []) => {
    each(items, (item) => {
      item.uid = uuid();

      each(get(item, 'request.headers'), (header) => header.uid = uuid());
      each(get(item, 'request.params'), (param) => param.uid = uuid());
      each(get(item, 'request.body.multipartForm'), (param) => param.uid = uuid());
      each(get(item, 'request.body.formUrlEncoded'), (param) => param.uid = uuid());

      if(item.items && item.items.length) {
        updateItemUids(item.items);
      }
    })
  }
  updateItemUids(collection.items);

  return collection;
};

const importCollection = () => {
  return new Promise((resolve, reject) => {
    fileDialog({accept: 'application/json'})
      .then(readFile)
      .then(parseJsonCollection)
      .then(validateSchema)
      .then(updateUidsInCollection)
      .then(validateSchema)
      .then((collection) => saveCollectionToIdb(window.__idb, collection))
      .then((collection) => {
        toast.success("Collection imported successfully");
        resolve(collection);
      })
      .catch((err) => {
        toast.error("Import collection failed");
        reject(err);
      });
  });
};

export default importCollection;