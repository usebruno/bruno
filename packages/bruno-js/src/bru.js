const Handlebars = require('handlebars');
const { cloneDeep } = require('lodash');

const envVariableNameRegex = /^(?!\d)[\w-]*$/;

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

    if (envVariableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters, "-", "_" and cannot start with a digit.'
      );
    }

    this.collectionVariables[key] = value;
  }

  getVar(key) {
    if (envVariableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!` +
          ' Names must only contain alpha-numeric characters and cannot start with a digit.'
      );
    }

    return this.collectionVariables[key];
  }
}

module.exports = Bru;
