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
  if (!collection?.brunoConfig?.clientCertificates?.certs || !Array.isArray(collection?.brunoConfig?.clientCertificates?.certs)) {
    return collection;
  }

 const newCollection = { ...collection };
  newCollection.brunoConfig = { ...collection.brunoConfig };
  newCollection.brunoConfig.clientCertificates = { ...collection.brunoConfig.clientCertificates };
  newCollection.brunoConfig.clientCertificates.certs = collection.brunoConfig.clientCertificates.certs.map(cert => {
    const newCert = { ...cert };
    if (newCert.pfxFilePath) newCert.pfxFilePath = normalizePath(newCert.pfxFilePath);
    if (newCert.certFilePath) newCert.certFilePath = normalizePath(newCert.certFilePath);
    if (newCert.keyFilePath) newCert.keyFilePath = normalizePath(newCert.keyFilePath);
    return newCert;
  });
  return newCollection;
}

const importCollection = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ accept: 'application/json' })
      .then(readFile)
      .then(parseJsonCollection)
      .then((collection) => {
        return normalizeCertPathsInCollection(collection);
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
