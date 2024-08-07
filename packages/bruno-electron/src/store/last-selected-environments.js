const _ = require('lodash');
const Store = require('electron-store');

class LastSelectedEnvironments {
  constructor() {
    this.store = new Store({
      name: 'environments',
      clearInvalidConfig: true
    });
  }

  updateLastSelectedEnvironment(collectionUid, environmentName) {
    const lastSelectedEnvironments = this.store.get('lastSelectedEnvironments') || {};

    const updatedLastSelectedEnvironments = {
      ...lastSelectedEnvironments,
      [collectionUid]: environmentName
    };

    return this.store.set('lastSelectedEnvironments', updatedLastSelectedEnvironments);
  }

  getLastSelectedEnvironment(collectionUid) {
    const lastSelectedEnvironments = this.store.get('lastSelectedEnvironments') || {};
    return lastSelectedEnvironments[collectionUid];
  }
}

const lastSelectedEnvironments = new LastSelectedEnvironments();

const updateLastSelectedEnvironment = (collectionUid, environmentName) => {
  return lastSelectedEnvironments.updateLastSelectedEnvironment(collectionUid, environmentName);
};

const getLastSelectedEnvironment = (collectionUid) => {
  return lastSelectedEnvironments.getLastSelectedEnvironment(collectionUid);
};

module.exports = {
  updateLastSelectedEnvironment,
  getLastSelectedEnvironment
};
