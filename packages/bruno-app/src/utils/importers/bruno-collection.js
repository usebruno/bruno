import fileDialog from 'file-dialog';
import { BrunoError } from 'utils/common/error';
import { validateSchema, transformItemsInCollection, updateUidsInCollection, hydrateSeqInCollection } from './common';
import { normalizePath } from 'utils/common/path';

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

function normalizeCertPathsInCollection(collection) {
  if (collection.clientCertificates && Array.isArray(collection.clientCertificates.certs)) {
    collection.clientCertificates.certs.forEach(cert => {
      if (cert.pfxFilePath) cert.pfxFilePath = normalizePath(cert.pfxFilePath);
      if (cert.certFilePath) cert.certFilePath = normalizePath(cert.certFilePath);
      if (cert.keyFilePath) cert.keyFilePath = normalizePath(cert.keyFilePath);
    });
  }
}

const importCollection = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ accept: 'application/json' })
      .then(readFile)
      .then(parseJsonCollection)
      .then((collection) => {
        normalizeCertPathsInCollection(collection);
        return collection;
      })
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
