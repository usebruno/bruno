const { cloneDeep } = require('lodash');
const xmlFormat = require('xml-formatter');
const { interpolate: _interpolate } = require('@usebruno/common');
const { sendRequest, createSendRequest } = require('@usebruno/requests').scripting;
const { jar: createCookieJar, getCookiesForUrl } = require('@usebruno/requests').cookies;

const variableNameRegex = /^[\w-.]*$/;

class Bru {
  /**
   * @param {string} runtime - The runtime environment ('quickjs' or 'nodevm')
   * @param {object} envVariables - Environment variables
   * @param {object} runtimeVariables - Runtime variables
   * @param {object} processEnvVars - Process environment variables
   * @param {string} collectionPath - Path to the collection
   * @param {object} collectionVariables - Collection-level variables
   * @param {object} folderVariables - Folder-level variables
   * @param {object} requestVariables - Request-level variables
   * @param {object} globalEnvironmentVariables - Global environment variables
   * @param {object} oauth2CredentialVariables - OAuth2 credential variables
   * @param {string} collectionName - Name of the collection
   * @param {object} promptVariables - Prompt variables
   * @param {object} certsAndProxyConfig - Configuration for bru.sendRequest (proxy, certs, TLS)
   * @param {string} certsAndProxyConfig.collectionPath - Path to the collection
   * @param {object} certsAndProxyConfig.options - TLS and proxy options
   * @param {object} [certsAndProxyConfig.clientCertificates] - Client certificate configuration
   * @param {object} [certsAndProxyConfig.collectionLevelProxy] - Collection-level proxy settings
   * @param {object} [certsAndProxyConfig.systemProxyConfig] - System proxy configuration
   * @param {string} requestUrl - The URL of the current request (used for cookie access)
   */
  constructor(runtime, envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, oauth2CredentialVariables, collectionName, promptVariables, certsAndProxyConfig, requestUrl) {
    this.envVariables = envVariables || {};
    this.runtimeVariables = runtimeVariables || {};
    this.promptVariables = promptVariables || {};
    this.processEnvVars = cloneDeep(processEnvVars || {});
    this.collectionVariables = collectionVariables || {};
    this.folderVariables = folderVariables || {};
    this.requestVariables = requestVariables || {};
    this.globalEnvironmentVariables = globalEnvironmentVariables || {};
    this.oauth2CredentialVariables = oauth2CredentialVariables || {};
    this.collectionPath = collectionPath;
    this.collectionName = collectionName;
    // Use createSendRequest with config if provided, otherwise use default sendRequest
    this.sendRequest = certsAndProxyConfig ? createSendRequest(certsAndProxyConfig) : sendRequest;
    this.runtime = runtime;
    this.requestUrl = requestUrl;
    this.cookies = {
      get: (name) => {
        const url = this.interpolate(this.requestUrl);
        if (!url) return undefined;
        const cookies = getCookiesForUrl(url);
        const cookie = cookies.find((c) => c.key === name);
        return cookie ? cookie.value : undefined;
      },
      has: (name) => {
        const url = this.interpolate(this.requestUrl);
        if (!url) return false;
        const cookies = getCookiesForUrl(url);
        return cookies.some((c) => c.key === name);
      },
      toObject: () => {
        const url = this.interpolate(this.requestUrl);
        if (!url) return {};
        const cookies = getCookiesForUrl(url);
        const result = {};
        for (const cookie of cookies) {
          result[cookie.key] = cookie.value;
        }
        return result;
      },
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

    this.utils = {
      minifyJson: (json) => {
        if (json === null || json === undefined) {
          throw new Error('Failed to minify');
        }

        if (typeof json === 'object') {
          try {
            return JSON.stringify(json);
          } catch (err) {
            throw new Error(`Failed to minify: ${err?.message || err}`);
          }
        }

        if (typeof json === 'string') {
          const trimmed = json.trim();
          if (trimmed === '') return trimmed;
          try {
            return JSON.stringify(JSON.parse(trimmed));
          } catch (err) {
            throw new Error(`Failed to minify: ${err?.message || err}`);
          }
        }

        throw new TypeError('minifyJson expects a string or object');
      },

      minifyXml: (xml) => {
        if (xml === null || xml === undefined) {
          throw new Error('Failed to minify');
        }

        if (typeof xml === 'string') {
          try {
            return xmlFormat(xml, { collapseContent: false, indentation: '', lineSeparator: '' });
          } catch (err) {
            throw new Error(`Failed to minify: ${err?.message || err}`);
          }
        }

        throw new TypeError('minifyXml expects a string');
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
      ...this.promptVariables,
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

    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters! Names must only contain alpha-numeric characters, "-", "_", "."`
      );
    }

    // When persist is true, only string values are allowed
    if (options?.persist && typeof value !== 'string') {
      throw new Error(`Persistent environment variables must be strings. Received ${typeof value} for key "${key}".`);
    }

    this.envVariables[key] = value;

    if (options?.persist) {
      this.persistentEnvVariables[key] = value;
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
        `Variable name: "${key}" contains invalid characters!`
        + ' Names must only contain alpha-numeric characters, "-", "_", "."'
      );
    }

    this.runtimeVariables[key] = value;
  }

  getVar(key) {
    if (variableNameRegex.test(key) === false) {
      throw new Error(
        `Variable name: "${key}" contains invalid characters!`
        + ' Names must only contain alpha-numeric characters, "-", "_", "."'
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

  isSafeMode() {
    return this.runtime === 'quickjs';
  }
}

module.exports = Bru;
