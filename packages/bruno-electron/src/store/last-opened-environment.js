const Yup = require('yup');
const Store = require('electron-store');

const lastOpenedEnvironmentSchema = Yup.object().shape({
  environmentUid: Yup.string().nullable(),
  collectionUid: Yup.string()
});

class LastOpenedEnvironmentsStore {
  constructor() {
    this.store = new Store({
      name: 'preferences',
      clearInvalidConfig: true
    });
  }

  get() {
    return this.store.get('lastOpenedEnvironments') || {};
  }

  add({ environmentUid, collectionUid }) {
    const lastOpenedEnvironments = this.get();

    lastOpenedEnvironments[collectionUid] = environmentUid;

    this.store.set('lastOpenedEnvironments', lastOpenedEnvironments);
  }

  remove(collectionUid) {
    const lastOpenedEnvironments = this.get();

    delete lastOpenedEnvironments[collectionUid];

    this.store.set('lastOpenedEnvironments', lastOpenedEnvironments);
  }
}

const lastOpenedEnvironmentsStore = new LastOpenedEnvironmentsStore();

const getLastOpenedEnvironment = (collectionUid) => {
  const lastOpenedEnvironments = lastOpenedEnvironmentsStore.get();
  return lastOpenedEnvironments[collectionUid];
};

const removeLastOpenedEnvironment = (collectionUid) => {
  lastOpenedEnvironmentsStore.remove(collectionUid);
};

const saveLastOpenedEnvironment = async (newLastOpenedEnvironment) => {
  return new Promise((resolve, reject) => {
    lastOpenedEnvironmentSchema
      .validate(newLastOpenedEnvironment, { abortEarly: true })
      .then((validatedLastOpenedEnvironment) => {
        lastOpenedEnvironmentsStore.add(validatedLastOpenedEnvironment);
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = {
  getLastOpenedEnvironment,
  removeLastOpenedEnvironment,
  saveLastOpenedEnvironment
};
