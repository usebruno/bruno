import fileDialog from 'file-dialog';
import { saveCollectionToIdb } from 'utils/idb';
import { BrunoError } from 'utils/common/error';
import { validateSchema, updateUidsInCollection } from './common';
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
