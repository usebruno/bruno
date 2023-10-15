const Store = require('electron-store');
const { get } = require('lodash');

/**
 * The preferences are stored in the electron store 'preferences.json'.
 * The electron process uses this module to get the preferences.
 *
 * {
 *   preferences {
 *     request: {
 *       tlsVerification: boolean,
 *       cacert: String (yet not implemented in front end)
 *     }
 *     proxy: { (yet not implemented in front end)
 *       ...
 *     }
 *   }
 * }
 */

const defaultPreferences = {
  request: {
    tlsVerification: true,
    caCert: ''
  },
  proxy: {
    enabled: false,
    protocol: 'http',
    hostnameHttp: '',
    portHttp: '',
    auth: {
      enabled: false,
      username: '',
      password: ''
    },
    noProxy: ''
  }
};

class PreferencesStore {
  constructor() {
    this.store = new Store({
      name: 'preferences',
      clearInvalidConfig: true
    });
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  getPath() {
    return this.store.path;
  }
}
const preferencesStore = new PreferencesStore();

const getPreferences = () => {
  return {
    ...defaultPreferences,
    ...(preferencesStore.get('preferences') || {})
  };
};

const preferences = {
  getAll() {
    return getPreferences();
  },

  getPath() {
    return preferencesStore.getPath();
  },

  isTlsVerification: () => {
    return get(getPreferences(), 'request.tlsVerification', true);
  },

  getCaCert: () => {
    return get(getPreferences(), 'request.cacert');
  },

  getProxyConfig: () => {
    return get(getPreferences(), 'proxy', {});
  },

  setPreferences: (validatedPreferences) => {
    const updatedPreferences = {
      ...getPreferences(),
      ...validatedPreferences
    };
    preferencesStore.set('preferences', updatedPreferences);
  },

  migrateSslVerification: (sslVerification) => {
    let preferences = getPreferences();
    if (!preferences.request) {
      const updatedPreferences = {
        ...preferences,
        request: {
          tlsVerification: sslVerification
        }
      };
      preferencesStore.set('preferences', updatedPreferences);
    }
  }
};

module.exports = preferences;
