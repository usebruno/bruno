const { cloneDeep } = require('lodash');
const { interpolate: _interpolate } = require('@usebruno/common');
const { sendRequest } = require('@usebruno/requests').scripting;
const { jar: createCookieJar } = require('@usebruno/common').cookies;

const variableNameRegex = /^[\w-.]*$/;

class Bru {
  constructor(envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, oauth2CredentialVariables, collectionName) {
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
    this.sendRequest = sendRequest;
    this.cookies = {
      jar: () => {
        const cookieJar = createCookieJar();
                
        return {
          getCookie: (url, cookieName, callback) => {
            const interpolatedUrl = this.interpolate(url);
            return cookieJar.getCookie(interpolatedUrl, cookieName, callback);
          },

          getCookies: (url, callback) => {
            const interpolatedUrl = this.interpolate(url);
            return cookieJar.getCookies(interpolatedUrl, callback);
          },

          setCookie: (url, nameOrCookieObj, valueOrCallback, maybeCallback) => {
            const interpolatedUrl = this.interpolate(url);
            return cookieJar.setCookie(interpolatedUrl, nameOrCookieObj, valueOrCallback, maybeCallback);
          },

          setCookies: (url, cookiesArray, callback) => {
            const interpolatedUrl = this.interpolate(url);
            return cookieJar.setCookies(interpolatedUrl, cookiesArray, callback);
          },

          // Clear entire cookie jar
          clear: (callback) => {
            return cookieJar.clear(callback);
          },

          // Delete cookies for a specific URL/domain
          deleteCookies: (url, callback) => {
            const interpolatedUrl = this.interpolate(url);
            return cookieJar.deleteCookies(interpolatedUrl, callback);
          },

          deleteCookie: (url, cookieName, callback) => {
            const interpolatedUrl = this.interpolate(url);
            return cookieJar.deleteCookie(interpolatedUrl, cookieName, callback);
          }
        };
      }
    };
    // Holds variables that are marked as persistent by scripts
    this.persistentEnvVariables = {};
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

  setEnvVar(key, value, options = {}) {
    if (!key) {
      throw new Error('Creating a env variable without specifying a name is not allowed.');
    }

    this.envVariables[key] = value;

    if (options?.persist) {
      this.persistentEnvVariables[key] = value
    } else {
      if (this.persistentEnvVariables[key]) {
        delete this.persistentEnvVariables[key];
      }
    }
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
}

module.exports = Bru;
