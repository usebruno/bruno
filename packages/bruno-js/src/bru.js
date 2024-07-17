const { cloneDeep } = require('lodash');
const { interpolate } = require('@usebruno/common');

const variableNameRegex = /^[\w-.]*$/;

class Bru {
  constructor(
    envVariables,
    runtimeVariables,
    processEnvVars,
    collectionPath,
    resolvedRequestVariables,
    requestVariables,
    folderVariables,
    collectionVariables
  ) {
    this.envVariables = envVariables || {};
    this.runtimeVariables = runtimeVariables || {};
    this.processEnvVars = cloneDeep(processEnvVars || {});
    this.requestVariables = requestVariables || {};
    this.folderVariables = folderVariables || {};
    this.collectionVariables = collectionVariables || {};
    this.resolvedRequestVariables = resolvedRequestVariables || {};
    this.collectionPath = collectionPath;
  }

  _interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const combinedVars = {
      process: {
        env: {
          ...this.processEnvVars
        }
      },
      ...this.envVariables,
      ...this.resolvedRequestVariables,
      ...this.runtimeVariables
    };

    return interpolate(str, combinedVars);
  };

  cwd() {
    return this.collectionPath;
  }

  getEnvName() {
    return this.envVariables.__name__;
  }

  getProcessEnv(key) {
    return this.processEnvVars[key];
  }

  hasEnvVar(key) {
    return Object.hasOwn(this.envVariables, key);
  }

  getEnvVar(key) {
    return this._interpolate(this.envVariables[key]);
  }

  setEnvVar(key, value) {
    if (!key) {
      throw new Error('Creating a env variable without specifying a name is not allowed.');
    }

    this.envVariables[key] = value;
  }

  hasVar(key) {
    return Object.hasOwn(this.runtimeVariables, key);
  }

  setVar(key, value) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }

    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    this.runtimeVariables[key] = value;
  }

  getVar(key) {
    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    return this._interpolate(this.runtimeVariables[key]);
  }

  deleteVar(key) {
    delete this.runtimeVariables[key];
  }

  getRequestVar(key) {
    return this._interpolate(this.requestVariables[key]);
  }

  getCollectionVar(key) {
    return this._interpolate(this.collectionVariables[key]);
  }

  getFolderVar(key) {
    return this._interpolate(this.folderVariables[key]);
  }

  setNextRequest(nextRequest) {
    this.nextRequest = nextRequest;
  }

  getResolvedRequestVar(key) {
    return this._interpolate(this.resolvedRequestVariables[key]);
  }
}

module.exports = Bru;
