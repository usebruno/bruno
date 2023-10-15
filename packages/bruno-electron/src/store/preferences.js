const Yup = require('yup');
const Store = require('electron-store');

const defaultPreferences = {
  request: {
    sslVerification: true
  },
  font: {
    codeFont: 'default'
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
      ...defaultPreferences,
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

module.exports = {
  getPreferences,
  savePreferences
};
