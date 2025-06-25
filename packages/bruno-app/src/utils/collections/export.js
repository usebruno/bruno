import * as FileSaver from 'file-saver';
import get from 'lodash/get';
import each from 'lodash/each';
import { normalizePath } from 'utils/common/path';

export const deleteUidsInItems = (items) => {
  each(items, (item) => {
    delete item.uid;

    if (['http-request', 'graphql-request'].includes(item.type)) {
      each(get(item, 'request.headers'), (header) => delete header.uid);
      each(get(item, 'request.params'), (param) => delete param.uid);
      each(get(item, 'request.vars.req'), (v) => delete v.uid);
      each(get(item, 'request.vars.res'), (v) => delete v.uid);
      each(get(item, 'request.vars.assertions'), (a) => delete a.uid);
      each(get(item, 'request.body.multipartForm'), (param) => delete param.uid);
      each(get(item, 'request.body.formUrlEncoded'), (param) => delete param.uid);
      each(get(item, 'request.body.file'), (param) => delete param.uid);
    }

    if (item.items && item.items.length) {
      deleteUidsInItems(item.items);
    }
  });
};

/**
 * Some of the models in the app are not consistent with the Collection Json format
 * This function is used to transform the models to the Collection Json format
 */
export const transformItem = (items = []) => {
  each(items, (item) => {
    if (['http-request', 'graphql-request'].includes(item.type)) {
      if (item.type === 'graphql-request') {
        item.type = 'graphql';
      }

      if (item.type === 'http-request') {
        item.type = 'http';
      }
    }

    if (item.items && item.items.length) {
      transformItem(item.items);
    }
  });
};

export const deleteUidsInEnvs = (envs) => {
  each(envs, (env) => {
    delete env.uid;
    each(env.variables, (variable) => delete variable.uid);
  });
};

export const deleteSecretsInEnvs = (envs) => {
  each(envs, (env) => {
    each(env.variables, (variable) => {
      if (variable.secret) {
        variable.value = '';
      }
    });
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

export const exportCollection = (collection) => {
  // delete uids
  delete collection.uid;

  // delete process variables
  delete collection.processEnvVariables;

  deleteUidsInItems(collection.items);
  deleteUidsInEnvs(collection.environments);
  deleteSecretsInEnvs(collection.environments);
  transformItem(collection.items);

  const normalizedCollection = normalizeCertPathsInCollection(collection);
  
  const fileName = `${normalizedCollection.name}.json`;
  const fileBlob = new Blob([JSON.stringify(normalizedCollection, null, 2)], { type: 'application/json' });

  FileSaver.saveAs(fileBlob, fileName);
};

export default exportCollection;
