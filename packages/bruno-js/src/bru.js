const { cloneDeep } = require('lodash');
const { interpolate } = require('@usebruno/common');

const variableNameRegex = /^[\w-.]*$/;

class Bru {
  constructor(envVariables, collectionVariables, processEnvVars, collectionPath, requestVariables) {
    this.envVariables = envVariables || {};
    this.collectionVariables = collectionVariables || {};
    this.processEnvVars = cloneDeep(processEnvVars || {});
    this.requestVariables = requestVariables || {};
    this.collectionPath = collectionPath;
  }

  _interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const combinedVars = {
      ...this.envVariables,
      ...this.requestVariables,
      ...this.collectionVariables,
      process: {
        env: {
          ...this.processEnvVars
        }
      }
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

  clearEnvVars() {
    Object.keys(this.envVariables).forEach((k) => delete this.envVariables[k]);
  }

  hasEnvVar(key) {
    if (!key) {
      throw new Error('Verification of variable existence without specifying a name is not allowed.');
    }

    return !!this.getEnvVar(key);
  }

  getEnvVar(key) {
    return this._interpolate(this.envVariables[key]);
  }

  unsetEnvVar(key) {
    if (!key) {
      throw new Error('Reseting a env variable without specifying a name is not allowed.');
    }

    delete this.envVariables[key];
  }

  setEnvVar(key, value) {
    if (!key) {
      throw new Error('Creating a env variable without specifying a name is not allowed.');
    }

    this.envVariables[key] = value;
  }

  hasVar(key) {
    if (!key) {
      throw new Error('Verification of variable existence without specifying a name is not allowed.');
    }

    return !!this.getVar(key);
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

    this.collectionVariables[key] = value;
  }

  unsetVar(key) {
    if (!key) {
      throw new Error('Reseting a variable without specifying a name is not allowed.');
    }

    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    delete this.collectionVariables[key];
  }

  getVar(key) {
    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    return this._interpolate(this.collectionVariables[key]);
  }

  getRequestVar(key) {
    return this._interpolate(this.requestVariables[key]);
  }

  clearVars() {
    Object.keys(this.collectionVariables).forEach((k) => delete this.collectionVariables[k]);
  }

  setNextRequest(nextRequest) {
    this.nextRequest = nextRequest;
  }
}

module.exports = Bru;
