const _ = require('lodash');
const Store = require('electron-store');
const { encryptString, decryptString } = require('../utils/encryption');

class GlobalEnvironmentsStore {
  constructor() {
    this.store = new Store({
      name: 'global-environments',
      clearInvalidConfig: true
    });
  }

  isValidValue(val) {
    return typeof val === 'string' && val.length >= 0;
  }

  encryptGlobalEnvironmentVariables({ globalEnvironments }) {
    return globalEnvironments?.map(env => {
      const variables = env.variables?.map(v => ({
        ...v,
        value: v?.secret ? (this.isValidValue(v.value) ? encryptString(v.value) : '') : v?.value
      })) || [];
  
      return {
        ...env,
        variables
      };
    });
  }

  decryptGlobalEnvironmentVariables({ globalEnvironments }) {
    return globalEnvironments?.map(env => {
      const variables = env.variables?.map(v => ({
        ...v,
        value: v?.secret ? (this.isValidValue(v.value) ? decryptString(v.value) : '') : v?.value
      })) || [];
  
      return {
        ...env,
        variables
      };
    });
  }
  
  getGlobalEnvironments() {
    let globalEnvironments = this.store.get('environments', []);
    globalEnvironments = this.decryptGlobalEnvironmentVariables({ globalEnvironments });
    return globalEnvironments;
  }

  getActiveGlobalEnvironmentUid() {
    return this.store.get('activeGlobalEnvironmentUid', null);
  }

  setGlobalEnvironments(globalEnvironments) {
    globalEnvironments = this.encryptGlobalEnvironmentVariables({ globalEnvironments });
    return this.store.set('environments', globalEnvironments);
  }

  setActiveGlobalEnvironmentUid(uid) {
    return this.store.set('activeGlobalEnvironmentUid', uid);
  }

  addGlobalEnvironment({ uid, name, variables = [] }) {
    let globalEnvironments = this.getGlobalEnvironments();
    globalEnvironments.push({
      uid,
      name,
      variables
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
  
  deleteGlobalEnvironment({ environmentUid }) {
    let globalEnvironments = this.getGlobalEnvironments();
    let activeGlobalEnvironmentUid = this.getActiveGlobalEnvironmentUid();
    globalEnvironments = globalEnvironments.filter(env => env?.uid !== environmentUid);
    if (environmentUid == activeGlobalEnvironmentUid) {
      this.setActiveGlobalEnvironmentUid(null); 
    }
    this.setGlobalEnvironments(globalEnvironments);
  }  
}

const globalEnvironmentsStore = new GlobalEnvironmentsStore();

module.exports = {
  globalEnvironmentsStore
};
