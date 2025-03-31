import { BrunoError } from 'utils/common/error';
import { validateSchema, transformItemsInCollection, updateUidsInCollection, hydrateSeqInCollection } from './common';

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

const importCollection = (file) => {
  return new Promise((resolve, reject) => {
    readFile([file])
      .then(parseJsonCollection)
      .then(hydrateSeqInCollection)
      .then(updateUidsInCollection)
      .then(transformItemsInCollection)
      .then(validateSchema)
      .then((collection) => resolve({ collection }))
      .catch((err) => {
        console.log(err);
        reject(new BrunoError('Import collection failed'));
      });
  });
};

export default importCollection;
