const { cloneDeep } = require('lodash');
const { interpolate } = require('@usebruno/common');
const axios = require('axios');

const variableNameRegex = /^[\w-.]*$/;

class Bru {
  constructor(envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables) {
    this.envVariables = envVariables || {};
    this.runtimeVariables = runtimeVariables || {};
    this.processEnvVars = cloneDeep(processEnvVars || {});
    this.collectionVariables = collectionVariables || {};
    this.folderVariables = folderVariables || {};
    this.requestVariables = requestVariables || {};
    this.globalEnvironmentVariables = globalEnvironmentVariables || {};
    this.collectionPath = collectionPath;
    this.runner = {
      skipRequest: () => {
        this.skipRequest = true;
      },
      stopExecution: () => {
        this.stopExecution = true;
      },
      setNextRequest: (nextRequest) => {
        this.nextRequest = nextRequest;
      }
    };
    this.axios = axios.create();
  }

  _interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const combinedVars = {
      ...this.globalEnvironmentVariables,
      ...this.collectionVariables,
      ...this.envVariables,
      ...this.folderVariables,
      ...this.requestVariables,
      ...this.runtimeVariables,
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

  deleteEnvVar(key) {
    delete this.envVariables[key];
  }

  getGlobalEnvVar(key) {
    return this._interpolate(this.globalEnvironmentVariables[key]);
  }

  setGlobalEnvVar(key, value) {
    if (!key) {
      throw new Error('Creating a env variable without specifying a name is not allowed.');
    }

    this.globalEnvironmentVariables[key] = value;
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

  deleteAllVars() {
    for (let key in this.runtimeVariables) {
      if (this.runtimeVariables.hasOwnProperty(key)) {
        delete this.runtimeVariables[key];
      }
    }
  }

  getCollectionVar(key) {
    return this._interpolate(this.collectionVariables[key]);
  }

  getFolderVar(key) {
    return this._interpolate(this.folderVariables[key]);
  }

  getRequestVar(key) {
    return this._interpolate(this.requestVariables[key]);
  }

  setNextRequest(nextRequest) {
    this.nextRequest = nextRequest;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  sendRequest(requestConfig, callback) {
    if (typeof callback === 'function') {
      this._sendRequestWithCallback(requestConfig, callback);
      return;
    }

    return this._sendRequestWithPromise(requestConfig);
  }

  async _sendRequestWithPromise(requestConfig) {
    try {
      const config = typeof requestConfig === 'string' 
        ? { url: requestConfig, method: 'GET' } 
        : { ...requestConfig };

      if (config.body) {
        config.data = config.body;
        delete config.body;
      }

      config.url = this._interpolate(config.url);
      
      if (config.data) {
        if (typeof config.data === 'string') {
          config.data = this._interpolate(config.data);
        } else if (typeof config.data === 'object') {
          config.data = JSON.parse(this._interpolate(JSON.stringify(config.data)));
        }
      }

      const response = await this.axios(config);
      
      return {
        code: response.status,
        status: response.statusText,
        headers: response.headers,
        body: response.data
      };
    } catch (error) {
      if (error.response) {
        return {
          code: error.response.status,
          status: error.response.statusText,
          headers: error.response.headers,
          body: error.response.data
        };
      }
      throw error;
    }
  }

  _sendRequestWithCallback(requestConfig, callback) {
    this._sendRequestWithPromise(requestConfig)
      .then(response => callback(null, response))
      .catch(error => callback(error, null));
  }
}

module.exports = Bru;
