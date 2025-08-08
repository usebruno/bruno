const _ = require('lodash');
const Store = require('electron-store');
const { uuid, safeStringifyJSON, safeParseJSON } = require('../utils/common');
const { encryptStringSafe, decryptStringSafe } = require('../utils/encryption');

/**
 * Sample secrets store file
 *
 * {
 *   "collections": [{
 *     "path": "/Users/anoop/Code/acme-acpi-collection",
 *     "environments" : [{
 *       "name": "Local",
 *       "secrets": [{
 *         "name": "token",
 *         "value": "abracadabra"
 *       }]
 *     }]
 *   }]
 * }
 */

class Oauth2Store {
  constructor() {
    this.store = new Store({
      name: 'oauth2',
      clearInvalidConfig: true
    });
  }

  // Get oauth2 data for all collections
  getAllOauth2Data() {
    let oauth2Data = this.store.get('collections');
    if (!Array.isArray(oauth2Data)) oauth2Data = [];
    return oauth2Data;
  }

  // Get oauth2 data for a collection
  getOauth2DataOfCollection({ collectionUid, url }) {
    let oauth2Data = this.getAllOauth2Data();
    let oauth2DataForCollection = oauth2Data.find((d) => d?.collectionUid == collectionUid);

    // If oauth2 data is not present for the collection, add it to the store
    if (!oauth2DataForCollection) {
      let newOauth2DataForCollection = {
        collectionUid
      };
      let updatedOauth2Data = [...oauth2Data, newOauth2DataForCollection];
      this.store.set('collections', updatedOauth2Data);

      return newOauth2DataForCollection;
    }

    return oauth2DataForCollection;
  }

  // Update oauth2 data of a collection
  updateOauth2DataOfCollection({ collectionUid, url, data }) {
    let oauth2Data = this.getAllOauth2Data();

    let updatedOauth2Data = oauth2Data.filter((d) => d.collectionUid !== collectionUid);
    updatedOauth2Data.push({ ...data });

    this.store.set('collections', updatedOauth2Data);
  }

  // Create a new oauth2 Session Id for a collection
  createNewOauth2SessionIdForCollection({ collectionUid, url }) {
    let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });

    let newSessionId = uuid();

    let newOauth2DataForCollection = {
      ...oauth2DataForCollection,
      sessionId: newSessionId
    };

    this.updateOauth2DataOfCollection({ collectionUid, data: newOauth2DataForCollection });

    return newOauth2DataForCollection;
  }

  // Get session id of a collection
  getSessionIdOfCollection({ collectionUid, url }) {
    try {
      let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });

      if (oauth2DataForCollection?.sessionId && typeof oauth2DataForCollection.sessionId === 'string') {
        return oauth2DataForCollection.sessionId;
      }

      let newOauth2DataForCollection = this.createNewOauth2SessionIdForCollection({ collectionUid, url });
      return newOauth2DataForCollection?.sessionId;
    } catch (err) {
      console.log('error retrieving session id from cache', err);
    }
  }

  // clear session id of a collection
  clearSessionIdOfCollection({ collectionUid, url }) {
    try {
      let oauth2Data = this.getAllOauth2Data();

      let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });
      delete oauth2DataForCollection.sessionId;
      delete oauth2DataForCollection.credentials;

      let updatedOauth2Data = oauth2Data.filter((d) => d.collectionUid !== collectionUid);
      updatedOauth2Data.push({ ...oauth2DataForCollection });

      this.store.set('collections', updatedOauth2Data);
    } catch (err) {
      console.log('error while clearing the oauth2 session cache', err);
    }
  }

  getCredentialsForCollection({ collectionUid, url, credentialsId }) {
    try {
      let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });
      let credentials = oauth2DataForCollection?.credentials?.find(c => (c?.url == url) && (c?.credentialsId == credentialsId));
      if (!credentials?.data) return null;
      const decryptionResult = decryptStringSafe(credentials?.data);
      let decryptedCredentialsData = safeParseJSON(decryptionResult.value);
      return decryptedCredentialsData;
    } catch (err) {
      console.log('error retrieving oauth2 credentials from cache', err);
    }
  }

  updateCredentialsForCollection({ collectionUid, url, credentialsId, credentials = {} }) {
    try {
      const encryptionResult = encryptStringSafe(safeStringifyJSON(credentials));
      let encryptedCredentialsData = encryptionResult.value;
      let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });
      let filteredCredentials = oauth2DataForCollection?.credentials?.filter(c => (c?.url !== url) || (c?.credentialsId !== credentialsId));
      if (!filteredCredentials) filteredCredentials = [];
      filteredCredentials.push({
        url,
        data: encryptedCredentialsData,
        credentialsId
      });
      let newOauth2DataForCollection = {
        ...oauth2DataForCollection,
        credentials: filteredCredentials
      };
      this.updateOauth2DataOfCollection({ collectionUid, data: newOauth2DataForCollection });
      return newOauth2DataForCollection;
    } catch (err) {
      console.log('error updating oauth2 credentials from cache', err);
    }
  }

  clearCredentialsForCollection({ collectionUid, url, credentialsId }) {
    try {
      let oauth2DataForCollection = this.getOauth2DataOfCollection({ collectionUid, url });
      let filteredCredentials = oauth2DataForCollection?.credentials?.filter(c => (c?.url !== url) || (c?.credentialsId !== credentialsId));
      let newOauth2DataForCollection = {
        ...oauth2DataForCollection,
        credentials: filteredCredentials
      };
      this.updateOauth2DataOfCollection({ collectionUid, data: newOauth2DataForCollection });
      return newOauth2DataForCollection;
    } catch (err) {
      console.log('error clearing oauth2 credentials from cache', err);
    }
  }
}

module.exports = Oauth2Store;
