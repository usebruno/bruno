import fileDialog from 'file-dialog';
import { BrunoError } from 'utils/common/error';
import { validateSchema, transformItemsInCollection, updateUidsInCollection, hydrateSeqInCollection } from './common';

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

const readRemoteFile = (remoteFile) => {
  return new Promise((resolve, reject) => {

    const xhr = new XMLHttpRequest();
    xhr.open('GET', remoteFile, true);
    xhr.responseType = 'blob';

    xhr.onload = async function () {
      if (xhr.status === 200) {
        const blob = xhr.response;
        resolve(await blob.text());
      } else {
        console.error('File download failed:', xhr.status);
        reject();
      }
    };

    xhr.onerror = function () {
      console.error('File download failed');
      reject();
    };

    xhr.send();
  });

};

const importCollection = (remoteFile) => {
  return new Promise((resolve, reject) => {
    ((!remoteFile) ? 
      (fileDialog({ accept: 'application/json' }).then(readFile)) :
      (readRemoteFile(remoteFile)))
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
