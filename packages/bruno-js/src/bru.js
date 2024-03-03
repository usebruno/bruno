const Handlebars = require('handlebars');
const { cloneDeep } = require('lodash');

const variableNameRegex = /^[\w-.]*$/;

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
    return this._interpolateEnvVar(this.envVariables[key]);
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

    return this.collectionVariables[key];
  }

  clearVars() {
    Object.keys(this.collectionVariables).forEach((k) => delete this.collectionVariables[k]);
  }

  setNextRequest(nextRequest) {
    this.nextRequest = nextRequest;
  }
}

module.exports = Bru;
