const _ = require('lodash');
const Store = require('electron-store');
const { uuid } = require('../utils/common');

const Oauth2Store = (uid) => {
  let _store = new Store({
    name: `oauth2-${uid}`,
    clearInvalidConfig: true
  });

  return {
    getSession: () => {
      try {
        let session = _store.get('session');
        if (session) return session;
        let newSession = uuid();
        _store.set('session', `oauth2-${newSession}`);
        return newSession;
      } catch (err) {
        console.log('error retrieving session from cache', err);
      }
    },
    clearSession: () => {
      try {
        _store.set('session', null);
        return true;
      } catch (err) {
        console.log('error while clearing the oauth2 session cache', err);
      }
    }
  };
};

module.exports = Oauth2Store;
