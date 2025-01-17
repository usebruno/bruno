const _ = require('lodash');
const Store = require('electron-store');
const { uuid } = require('../utils/common');

class Oauth2Store {
  constructor() {
    this.store = new Store({
      name: 'preferences',
      clearInvalidConfig: true
    });
  }

  // Get oauth2 data for all collections
  getAllOauth2Data() {
    let oauth2Data = this.store.get('oauth2');
    if (!Array.isArray(oauth2Data)) oauth2Data = [];
    return oauth2Data;
  }

  // Get oauth2 data for a collection
  getOauth2DataOfCollection(collectionUid) {
    let oauth2Data = this.getAllOauth2Data();
    let oauth2DataForCollection = oauth2Data.find((d) => d?.collectionUid == collectionUid);

    // If oauth2 data is not present for the collection, add it to the store
    if (!oauth2DataForCollection) {
      let newOauth2DataForCollection = {
        collectionUid
      };
      let updatedOauth2Data = [...oauth2Data, newOauth2DataForCollection];
      this.store.set('oauth2', updatedOauth2Data);

      return newOauth2DataForCollection;
    }

    return oauth2DataForCollection;
  }

  // Update oauth2 data of a collection
  updateOauth2DataOfCollection(collectionUid, data) {
    let oauth2Data = this.getAllOauth2Data();

    let updatedOauth2Data = oauth2Data.filter((d) => d.collectionUid !== collectionUid);
    updatedOauth2Data.push({ ...data });

    this.store.set('oauth2', updatedOauth2Data);
  }

  // Create a new oauth2 Session ID for a collection
  createNewOauth2SessionIdForCollection(collectionUid) {
    let oauth2DataForCollection = this.getOauth2DataOfCollection(collectionUid);

    let newSessionId = uuid();

    let newOauth2DataForCollection = {
      ...oauth2DataForCollection,
      sessionId: newSessionId
    };

    this.updateOauth2DataOfCollection(collectionUid, newOauth2DataForCollection);

    return newOauth2DataForCollection;
  }

  // Get session id of a collection
  getSessionIdOfCollection(collectionUid) {
    try {
      let oauth2DataForCollection = this.getOauth2DataOfCollection(collectionUid);

      if (oauth2DataForCollection?.sessionId && typeof oauth2DataForCollection.sessionId === 'string') {
        return oauth2DataForCollection.sessionId;
      }

      let newOauth2DataForCollection = this.createNewOauth2SessionIdForCollection(collectionUid);
      return newOauth2DataForCollection?.sessionId;
    } catch (err) {
      console.log('error retrieving session id from cache', err);
    }
  }

  // clear session id of a collection
  clearSessionIdOfCollection(collectionUid) {
    try {
      let oauth2Data = this.getAllOauth2Data();

      let oauth2DataForCollection = this.getOauth2DataOfCollection(collectionUid);
      delete oauth2DataForCollection.sessionId;

      let updatedOauth2Data = oauth2Data.filter((d) => d.collectionUid !== collectionUid);
      updatedOauth2Data.push({ ...oauth2DataForCollection });

      this.store.set('oauth2', updatedOauth2Data);
    } catch (err) {
      console.log('error while clearing the oauth2 session cache', err);
    }
  }
}

module.exports = Oauth2Store;
