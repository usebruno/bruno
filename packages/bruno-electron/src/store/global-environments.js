const _ = require('lodash');
const Store = require('electron-store');

class GlobalEnvironmentsStore {
  constructor() {
    this.store = new Store({
      name: 'global-environments',
      clearInvalidConfig: true
    });
  }

  getGlobalEnvironments() {
    return this.store.get('environments', []);
  }

  getActiveGlobalEnvironmentUid() {
    return this.store.get('activeGlobalEnvironmentUid', null);
  }

  setGlobalEnvironments(environments) {
    return this.store.set('environments', environments);
  }

  setActiveGlobalEnvironmentUid(uid) {
    return this.store.set('activeGlobalEnvironmentUid', uid);
  }

  addGlobalEnvironment({ uid, name }) {
    let globalEnvironments = this.getGlobalEnvironments();
    globalEnvironments.push({
      uid,
      name,
      variables: []
    });
    this.setGlobalEnvironments(globalEnvironments);
  }

  saveGlobalEnvironment({ environmentUid: globalEnvironmentUid, variables }) {
    let globalEnvironments = this.getGlobalEnvironments();
    const environment = globalEnvironments.find(env => env?.uid == globalEnvironmentUid);
    globalEnvironments = globalEnvironments.filter(env => env?.uid !== globalEnvironmentUid);
    if (environment) {
      environment.variables = variables;
    }
    globalEnvironments.push(environment);
    this.setGlobalEnvironments(globalEnvironments);

  }
  
  renameGlobalEnvironment({ environmentUid: globalEnvironmentUid, name }) {
    let globalEnvironments = this.getGlobalEnvironments();
    const environment = globalEnvironments.find(env => env?.uid == globalEnvironmentUid);
    globalEnvironments = globalEnvironments.filter(env => env?.uid !== globalEnvironmentUid);
    if (environment) {
      environment.name = name;
    }
    globalEnvironments.push(environment);
    this.setGlobalEnvironments(globalEnvironments);
  }
  
  copyGlobalEnvironment({ uid, name, variables }) {
    let globalEnvironments = this.getGlobalEnvironments();
    globalEnvironments.push({
      uid,
      name,
      variables
    });
    this.setGlobalEnvironments(globalEnvironments);
  }
  
  selectGlobalEnvironment({ environmentUid: globalEnvironmentUid }) {
    let globalEnvironments = this.getGlobalEnvironments();
    const environment = globalEnvironments.find(env => env?.uid == globalEnvironmentUid);
    if (environment) {
      this.setActiveGlobalEnvironmentUid(globalEnvironmentUid);
    } else {
      this.setActiveGlobalEnvironmentUid(null);
    }
  }
  
  deleteGlobalEnvironment({ uid }) {
    let globalEnvironments = this.getGlobalEnvironments();
    globalEnvironments = globalEnvironments.filter(env => env?.uid !== uid);
    this.setGlobalEnvironments(globalEnvironments);
  }  
}

const globalEnvironmentsStore = new GlobalEnvironmentsStore();

module.exports = {
  globalEnvironmentsStore
};
