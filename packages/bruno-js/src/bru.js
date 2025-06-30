const { cloneDeep } = require('lodash');
const { interpolate: _interpolate } = require('@usebruno/common');
const { createSendRequestHandler } = require('@usebruno/requests').scripting;

const variableNameRegex = /^[\w-.]*$/;

class Bru {
  constructor(envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, oauth2CredentialVariables, collectionName, certsAndProxyConfig) {
    this.envVariables = envVariables || {};
    this.runtimeVariables = runtimeVariables || {};
    this.processEnvVars = cloneDeep(processEnvVars || {});
    this.collectionVariables = collectionVariables || {};
    this.folderVariables = folderVariables || {};
    this.requestVariables = requestVariables || {};
    this.globalEnvironmentVariables = globalEnvironmentVariables || {};
    this.oauth2CredentialVariables = oauth2CredentialVariables || {};
    this.collectionPath = collectionPath;
    this.collectionName = collectionName;
    
    // Array to store timeline entries from sendRequest calls
    this.timelines = [];
    
    // Create wrapped sendRequest handler that captures timeline
    const sendRequest = createSendRequestHandler({ certsAndProxyConfig });
    this.sendRequest = sendRequestHandler(sendRequest, this.timelines);
    
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
  }

  interpolate = (strOrObj) => {
    if (!strOrObj) return strOrObj;
    const isObj = typeof strOrObj === 'object';
    const strToInterpolate = isObj ? JSON.stringify(strOrObj) : strOrObj;

    const combinedVars = {
      ...this.globalEnvironmentVariables,
      ...this.collectionVariables,
      ...this.envVariables,
      ...this.folderVariables,
      ...this.requestVariables,
      ...this.oauth2CredentialVariables,
      ...this.runtimeVariables,
      process: {
        env: {
          ...this.processEnvVars
        }
      }
    };

    const interpolatedStr = _interpolate(strToInterpolate, combinedVars);
    return isObj ? JSON.parse(interpolatedStr) : interpolatedStr;
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
    return this.interpolate(this.envVariables[key]);
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
    return this.interpolate(this.globalEnvironmentVariables[key]);
  }

  setGlobalEnvVar(key, value) {
    if (!key) {
      throw new Error('Creating a env variable without specifying a name is not allowed.');
    }

    this.globalEnvironmentVariables[key] = value;
  }

  getOauth2CredentialVar(key) {
    return this.interpolate(this.oauth2CredentialVariables[key]);
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

    return this.interpolate(this.runtimeVariables[key]);
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
    return this.interpolate(this.collectionVariables[key]);
  }

  getFolderVar(key) {
    return this.interpolate(this.folderVariables[key]);
  }

  getRequestVar(key) {
    return this.interpolate(this.requestVariables[key]);
  }

  setNextRequest(nextRequest) {
    this.nextRequest = nextRequest;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getCollectionName() {
    return this.collectionName;
  }

  getTimelines() {
    return [...this.timelines]; // Return a copy to prevent external modification
  }

  clearTimelines() {
    this.timelines = [];
  }
}

const sendRequestHandler = (sendRequest, timelines) => {
  return async (requestConfig, callback) => {
    try {
      const response = await sendRequest(requestConfig, callback);
      if (response?.config?.timeline) {
        timelines.push({
          timestamp: Date.now(),
          request: {
            method: response.config.method,
            url: response.config.url,
            headers: response.config.headers
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            timeline: response.config.timeline
          }
        });
      }
      return response;
    } catch (error) {
      if (error?.config?.timeline) {
        timelines.push({
          timestamp: Date.now(),
          request: {
            method: error.config.method,
            url: error.config.url,
            headers: error.config.headers
          },
          response: {
            status: error.response?.status,
            statusText: error.response?.statusText || error?.code,
            headers: error.response?.headers,
            data: error.response?.data,
            error: error.message,
            timeline: error.config.timeline
          },
          error: true
        });
      }
      if (!error?.silent) {
        throw error;
      }
    }
  };
}

module.exports = Bru;