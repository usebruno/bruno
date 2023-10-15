const Yup = require('yup');
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
    sslVerification: true,
    caCert: ''
  },
  font: {
    codeFont: 'default'
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

const preferencesSchema = Yup.object().shape({
  request: Yup.object().shape({
    sslVerification: Yup.boolean()
  }),
  font: Yup.object().shape({
    codeFont: Yup.string().nullable()
  })
});

class PreferencesStore {
  constructor() {
    this.store = new Store({
      name: 'preferences',
      clearInvalidConfig: true
    });
  }

  getPreferences() {
    return {
      defaultPreferences,
      ...this.store.get('preferences')
    };
  }

  savePreferences(newPreferences) {
    return this.store.set('preferences', newPreferences);
  }
}

const preferencesStore = new PreferencesStore();

const getPreferences = () => {
  return preferencesStore.getPreferences();
};

const savePreferences = async (newPreferences) => {
  return new Promise((resolve, reject) => {
    preferencesSchema
      .validate(newPreferences, { abortEarly: true })
      .then((validatedPreferences) => {
        preferencesStore.savePreferences(validatedPreferences);
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
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
  }
};

module.exports = {
  getPreferences,
  savePreferences,
  preferences
};
