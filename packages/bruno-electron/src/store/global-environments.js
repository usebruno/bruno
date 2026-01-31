const _ = require('lodash');
const Store = require('electron-store');
const { encryptStringSafe, decryptStringSafe } = require('../utils/encryption');
const { environmentSchema } = require('@usebruno/schema');

class GlobalEnvironmentsStore {
  constructor() {
    this.store = new Store({
      name: 'global-environments',
      clearInvalidConfig: true
    });
  }

  /**
   * Validates and filters environments array, removing invalid entries
   * @param {Array} environments - Array of environment objects to validate
   * @returns {Array} - Array of valid environments
   */
  filterValidEnvironments(environments) {
    if (!Array.isArray(environments)) {
      return [];
    }

    return environments.filter((env) => {
      try {
        environmentSchema.validateSync(env);
        return true;
      } catch (error) {
        console.error('Invalid environment:', env);
        console.error(error);
        return false;
      }
    });
  }

  encryptGlobalEnvironmentVariables({ globalEnvironments }) {
    return globalEnvironments?.map((env) => {
      const variables = env.variables?.map((v) => ({
        ...v,
        value: v?.secret ? encryptStringSafe(v.value).value : v?.value
      })) || [];

      return {
        ...env,
        variables
      };
    });
  }

  decryptGlobalEnvironmentVariables({ globalEnvironments }) {
    return globalEnvironments?.map((env) => {
      const variables = env.variables?.map((v) => ({
        ...v,
        value: v?.secret ? decryptStringSafe(v.value).value : v?.value
      })) || [];

      return {
        ...env,
        variables
      };
    });
  }

  getGlobalEnvironments() {
    let globalEnvironments = this.store.get('environments', []);

    // Previously, a bug caused environment variables to be saved without a type.
    // Since that issue is now fixed, this code ensures that anyone who imported
    // data before the fix will have the missing types added retroactively.
    globalEnvironments?.forEach((env) => {
      env?.variables?.forEach((v) => {
        if (!v.type) {
          v.type = 'text';
        }
      });
    });

    globalEnvironments = this.filterValidEnvironments(globalEnvironments);

    globalEnvironments = this.decryptGlobalEnvironmentVariables({ globalEnvironments });

    return globalEnvironments;
  }

  getActiveGlobalEnvironmentUid() {
    return this.store.get('activeGlobalEnvironmentUid', null);
  }

  setGlobalEnvironments(globalEnvironments) {
    globalEnvironments = this.filterValidEnvironments(globalEnvironments);

    globalEnvironments = this.encryptGlobalEnvironmentVariables({ globalEnvironments });
    return this.store.set('environments', globalEnvironments);
  }

  setActiveGlobalEnvironmentUid(uid) {
    return this.store.set('activeGlobalEnvironmentUid', uid);
  }

  addGlobalEnvironment({ uid, name, variables = [] }) {
    let globalEnvironments = this.getGlobalEnvironments();
    const existingEnvironment = globalEnvironments.find((env) => env?.name == name);
    if (existingEnvironment) {
      throw new Error('Environment with the same name already exists');
    }
    globalEnvironments.push({
      uid,
      name,
      variables
    });
    this.setGlobalEnvironments(globalEnvironments);
  }

  saveGlobalEnvironment({ environmentUid: globalEnvironmentUid, variables }) {
    let globalEnvironments = this.getGlobalEnvironments();
    const environment = globalEnvironments.find((env) => env?.uid == globalEnvironmentUid);
    globalEnvironments = globalEnvironments.filter((env) => env?.uid !== globalEnvironmentUid);
    if (environment) {
      environment.variables = variables;
    }
    globalEnvironments.push(environment);
    this.setGlobalEnvironments(globalEnvironments);
  }

  renameGlobalEnvironment({ environmentUid: globalEnvironmentUid, name }) {
    let globalEnvironments = this.getGlobalEnvironments();
    const environment = globalEnvironments.find((env) => env?.uid == globalEnvironmentUid);
    globalEnvironments = globalEnvironments.filter((env) => env?.uid !== globalEnvironmentUid);
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
    const environment = globalEnvironments.find((env) => env?.uid == globalEnvironmentUid);
    if (environment) {
      this.setActiveGlobalEnvironmentUid(globalEnvironmentUid);
    } else {
      this.setActiveGlobalEnvironmentUid(null);
    }
  }

  deleteGlobalEnvironment({ environmentUid }) {
    let globalEnvironments = this.getGlobalEnvironments();
    let activeGlobalEnvironmentUid = this.getActiveGlobalEnvironmentUid();
    globalEnvironments = globalEnvironments.filter((env) => env?.uid !== environmentUid);
    if (environmentUid == activeGlobalEnvironmentUid) {
      this.setActiveGlobalEnvironmentUid(null);
    }
    this.setGlobalEnvironments(globalEnvironments);
  }

  updateGlobalEnvironmentColor({ environmentUid, color }) {
    let globalEnvironments = this.getGlobalEnvironments();
    const environment = globalEnvironments.find((env) => env?.uid == environmentUid);
    if (environment) {
      environment.color = color;
    }
    this.setGlobalEnvironments(globalEnvironments);
  }
}

const globalEnvironmentsStore = new GlobalEnvironmentsStore();

module.exports = {
  globalEnvironmentsStore
};
