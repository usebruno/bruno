const _ = require('lodash');
const Store = require('electron-store');
const { uuid, safeStringifyJSON, safeParseJSON } = require('../utils/common');
const { encryptStringSafe, decryptStringSafe } = require('../utils/encryption');

class Oauth1Store {
  constructor() {
    this.store = new Store({
      name: 'oauth1',
      clearInvalidConfig: true
    });
  }

  // Get oauth1 data for all collections
  getAllOauth1Data() {
    let oauth1Data = this.store.get('collections');
    if (!Array.isArray(oauth1Data)) oauth1Data = [];
    return oauth1Data;
  }

  // Get oauth1 data for a collection
  getOauth1DataOfCollection({ collectionUid }) {
    let oauth1Data = this.getAllOauth1Data();
    let oauth1DataForCollection = oauth1Data.find((d) => d?.collectionUid == collectionUid);

    // If oauth1 data is not present for the collection, add it to the store
    if (!oauth1DataForCollection) {
      let newOauth1DataForCollection = {
        collectionUid
      };
      let updatedOauth1Data = [...oauth1Data, newOauth1DataForCollection];
      this.store.set('collections', updatedOauth1Data);

      return newOauth1DataForCollection;
    }

    return oauth1DataForCollection;
  }

  // Update oauth1 data of a collection
  updateOauth1DataOfCollection({ collectionUid, data }) {
    let oauth1Data = this.getAllOauth1Data();

    let updatedOauth1Data = oauth1Data.filter((d) => d.collectionUid !== collectionUid);
    updatedOauth1Data.push({ ...data });

    this.store.set('collections', updatedOauth1Data);
  }

  // Create a new oauth1 Session Id for a collection
  createNewOauth1SessionIdForCollection({ collectionUid, credentialsId }) {
    let oauth1DataForCollection = this.getOauth1DataOfCollection({ collectionUid });

    let newSessionId = uuid();

    let newOauth1DataForCollection = {
      ...oauth1DataForCollection,
      sessionId: newSessionId
    };

    this.updateOauth1DataOfCollection({ collectionUid, data: newOauth1DataForCollection });

    return newOauth1DataForCollection;
  }

  // Get session id of a collection
  getSessionIdOfCollection({ collectionUid, credentialsId }) {
    try {
      let oauth1DataForCollection = this.getOauth1DataOfCollection({ collectionUid });

      if (oauth1DataForCollection?.sessionId && typeof oauth1DataForCollection.sessionId === 'string') {
        return oauth1DataForCollection.sessionId;
      }

      let newOauth1DataForCollection = this.createNewOauth1SessionIdForCollection({ collectionUid, credentialsId });
      return newOauth1DataForCollection?.sessionId;
    } catch (err) {
      console.log('error retrieving session id from cache', err);
    }
  }

  // clear session id of a collection
  clearSessionIdOfCollection({ collectionUid }) {
    try {
      let oauth1Data = this.getAllOauth1Data();

      let oauth1DataForCollection = this.getOauth1DataOfCollection({ collectionUid });
      delete oauth1DataForCollection.sessionId;
      delete oauth1DataForCollection.credentials;

      let updatedOauth1Data = oauth1Data.filter((d) => d.collectionUid !== collectionUid);
      updatedOauth1Data.push({ ...oauth1DataForCollection });

      this.store.set('collections', updatedOauth1Data);
    } catch (err) {
      console.log('error while clearing the oauth1 session cache', err);
    }
  }

  getCredentialsForCollection({ collectionUid, credentialsId }) {
    try {
      let oauth1DataForCollection = this.getOauth1DataOfCollection({ collectionUid });
      let credentials = oauth1DataForCollection?.credentials?.find((c) => c?.credentialsId == credentialsId);
      if (!credentials?.data) return null;
      const decryptionResult = decryptStringSafe(credentials?.data);
      const decryptedCredentialsData = safeParseJSON(decryptionResult.value);
      return decryptedCredentialsData;
    } catch (err) {
      console.log('error retrieving oauth1 credentials from cache', err);
    }
  }

  updateCredentialsForCollection({ collectionUid, credentialsId, credentials = {} }) {
    try {
      const encryptionResult = encryptStringSafe(safeStringifyJSON(credentials));
      const encryptedCredentialsData = encryptionResult.value;
      let oauth1DataForCollection = this.getOauth1DataOfCollection({ collectionUid });
      let filteredCredentials = oauth1DataForCollection?.credentials?.filter((c) => c?.credentialsId !== credentialsId);
      if (!filteredCredentials) filteredCredentials = [];
      filteredCredentials.push({
        data: encryptedCredentialsData,
        credentialsId
      });
      let newOauth1DataForCollection = {
        ...oauth1DataForCollection,
        credentials: filteredCredentials
      };
      this.updateOauth1DataOfCollection({ collectionUid, data: newOauth1DataForCollection });
      return newOauth1DataForCollection;
    } catch (err) {
      console.log('error updating oauth1 credentials from cache', err);
    }
  }

  clearCredentialsForCollection({ collectionUid, credentialsId }) {
    try {
      let oauth1DataForCollection = this.getOauth1DataOfCollection({ collectionUid });
      let filteredCredentials = oauth1DataForCollection?.credentials?.filter((c) => c?.credentialsId !== credentialsId);
      let newOauth1DataForCollection = {
        ...oauth1DataForCollection,
        credentials: filteredCredentials
      };
      this.updateOauth1DataOfCollection({ collectionUid, data: newOauth1DataForCollection });
      return newOauth1DataForCollection;
    } catch (err) {
      console.log('error clearing oauth1 credentials from cache', err);
    }
  }
}

module.exports = Oauth1Store;
