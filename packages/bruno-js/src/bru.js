const Handlebars = require('handlebars');
const { cloneDeep } = require('lodash');

class Bru {
  constructor(envVariables, collectionVariables, processEnvVars, collectionPath) {
    this.envVariables = envVariables;
    this.collectionVariables = collectionVariables;
    this.processEnvVars = cloneDeep(processEnvVars || {});
    this.collectionPath = collectionPath;
  }

  _interpolateEnvVar = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const template = Handlebars.compile(str, { noEscape: true });

    return template({
      process: {
        env: {
          ...this.processEnvVars
        }
      }
    });
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

  getEnvVar(key) {
    return this._interpolateEnvVar(this.envVariables[key]);
  }

  setEnvVar(key, value) {
    if (!key) {
      throw new Error('Key is required');
    }

    // gracefully ignore if key is not present in environment
    if (!this.envVariables.hasOwnProperty(key)) {
      return;
    }

    this.envVariables[key] = value;
  }

  setVar(key, value) {
    if (!key) {
      throw new Error('Key is required');
    }

    this.collectionVariables[key] = value;
  }

  getVar(key) {
    return this.collectionVariables[key];
  }

  setNextRequest(nextRequest) {
    this.nextRequest = nextRequest;
  }
}

module.exports = Bru;
