const _ = require('lodash');
const Store = require('electron-store');
const { uuid } = require('../utils/common');

const Oauth2Store = (uid) => {
  let _store = new Store({
    name: `preferences`,
    clearInvalidConfig: true
  });

  return {
    getSessionId: () => {
      try {
        let oauth2Data = _store.get('oauth2');
        if (!Array.isArray(oauth2Data)) oauth2Data = [];
        let oauth2DataForCollection = oauth2Data.find((d) => d?.collectionUid == uid);
        if (oauth2DataForCollection) return oauth2DataForCollection?.sessionId;
        let newSessionId = uuid();
        let newOauth2Data = [
          ...oauth2Data,
          {
            collectionUid: uid,
            sessionId: newSessionId
          }
        ];
        _store.set('oauth2', newOauth2Data);
        return newSessionId;
      } catch (err) {
        console.log('error retrieving session id from cache', err);
      }
    },
    clearSessionId: () => {
      try {
        let oauth2Data = _store.get('oauth2');
        if (!Array.isArray(oauth2Data)) oauth2Data = [];
        let filteredOauth2Data = oauth2Data.filter((d) => d?.collectionUid !== uid);
        _store.set('oauth2', filteredOauth2Data);
        return true;
      } catch (err) {
        console.log('error while clearing the oauth2 session cache', err);
      }
    }
  };
};

module.exports = Oauth2Store;
