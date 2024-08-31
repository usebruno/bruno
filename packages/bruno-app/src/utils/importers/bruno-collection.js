import { BrunoError } from 'utils/common/error';
import { validateSchema, transformItemsInCollection, updateUidsInCollection, hydrateSeqInCollection, loadFile } from './common';

const readFile = (files) => {
  console.log(files);
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



const importCollection = (url) => {
  return new Promise((resolve, reject) => {
    loadFile(url, readFile, { accept: 'application/json'})
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
