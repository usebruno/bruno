const { cloneDeep } = require('lodash');
const xmlFormat = require('xml-formatter');
const { interpolate: _interpolate } = require('@usebruno/common');
const { sendRequest, createSendRequest } = require('@usebruno/requests').scripting;
const { jar: createCookieJar, getCookiesForUrl } = require('@usebruno/requests').cookies;
const CookieList = require('./cookie-list');
const VariableList = require('./variable-list');

const variableNameRegex = /^[\w-.]*$/;

class Bru {
  /**
   * @param {object} options - Single options object (destructured)
   * @property {string} options.runtime - The runtime environment ('quickjs' or 'nodevm')
   * @property {object} [options.envVariables={}] - Environment variables
   * @property {object} [options.runtimeVariables={}] - Runtime variables
   * @property {object} [options.processEnvVars={}] - Process environment variables (deep cloned)
   * @property {string} [options.collectionPath] - Path to the collection
   * @property {object} [options.collectionVariables={}] - Collection-level variables
   * @property {object} [options.folderVariables={}] - Folder-level variables
   * @property {object} [options.requestVariables={}] - Request-level variables
   * @property {object} [options.globalEnvironmentVariables={}] - Global environment variables
   * @property {object} [options.oauth2CredentialVariables={}] - OAuth2 credential variables
   * @property {string} [options.collectionName] - Name of the collection
   * @property {object} [options.promptVariables={}] - Prompt variables
   * @property {object} [options.certsAndProxyConfig] - Configuration for bru.sendRequest (proxy, certs, TLS)
   * @property {string} [options.certsAndProxyConfig.collectionPath] - Path to the collection
   * @property {object} [options.certsAndProxyConfig.options] - TLS and proxy options
   * @property {object} [options.certsAndProxyConfig.clientCertificates] - Client certificate configuration
   * @property {object} [options.certsAndProxyConfig.collectionLevelProxy] - Collection-level proxy settings
   * @property {object} [options.certsAndProxyConfig.systemProxyConfig] - System proxy configuration
   * @property {string} [options.requestUrl] - The URL of the current request (used for cookie access)
   */
  constructor({
    runtime,
    envVariables,
    runtimeVariables,
    processEnvVars,
    collectionPath,
    collectionVariables,
    folderVariables,
    requestVariables,
    globalEnvironmentVariables,
    oauth2CredentialVariables,
    collectionName,
    promptVariables,
    certsAndProxyConfig,
    requestUrl
  }) {
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
    this.cookies = new CookieList({
      getUrl: () => this.interpolate(this.requestUrl),
      interpolate: (str) => this.interpolate(str),
      createCookieJar,
      getCookiesForUrl
    });

    const validateKey = (key) => {
      if (variableNameRegex.test(key) === false) {
        throw new Error(
          `Variable name: "${key}" contains invalid characters!`
          + ' Names must only contain alpha-numeric characters, "-", "_", "."'
        );
      }
    };

    this.variables = new VariableList(this.runtimeVariables, {
      interpolateFn: (val) => this.interpolate(val),
      validateKey
    });

    this.environment = new VariableList(this.envVariables, {
      interpolateFn: (val) => this.interpolate(val),
      validateKey,
      filterKeys: ['__name__'],
      onSet: (key, value, options) => {
        if (options?.persist) {
          if (typeof value !== 'string') {
            throw new Error(`Persistent environment variables must be strings. Received ${typeof value} for key "${key}".`);
          }
          this.persistentEnvVariables[key] = value;
        } else if (this.persistentEnvVariables[key]) {
          delete this.persistentEnvVariables[key];
        }
      }
    });
    Object.defineProperty(this.environment, 'name', {
      get: () => this.envVariables.__name__,
      enumerable: true
    });

    this.globals = new VariableList(this.globalEnvironmentVariables, {
      interpolateFn: (val) => this.interpolate(val),
      validateKey,
      filterKeys: ['__name__']
    });
    Object.defineProperty(this.globals, 'name', {
      get: () => this.globalEnvironmentVariables.__name__,
      enumerable: true
    });
    // TODO: globals.unset/clear work in the request lifecycle but do not update the UI.
    // Re-enable once the UI sync issue is resolved.
    this.globals.unset = () => {
      throw new Error('globals.unset is not implemented yet');
    };
    this.globals.clear = () => {
      throw new Error('globals.clear is not implemented yet');
    };

    // Holds variables that are marked as persistent by scripts
    this.persistentEnvVariables = {};
    // Holds credential IDs to be reset after script execution
    this.oauth2CredentialsToReset = [];
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

  getGlobalEnvName() {
    return this.globalEnvironmentVariables.__name__;
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

  getAllEnvVars() {
    const vars = Object.assign({}, this.envVariables);
    delete vars.__name__;
    return vars;
  }

  deleteAllEnvVars() {
    const envName = this.envVariables.__name__;
    for (let key in this.envVariables) {
      if (this.envVariables.hasOwnProperty(key)) {
        delete this.envVariables[key];
      }
    }
    if (envName !== undefined) {
      this.envVariables.__name__ = envName;
    }
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

  // TODO: deleteGlobalEnvVar works in the request lifecycle but does not update the UI.
  // Re-enable once the UI sync issue is resolved.
  // deleteGlobalEnvVar(key) {
  //   delete this.globalEnvironmentVariables[key];
  // }

  getAllGlobalEnvVars() {
    return Object.assign({}, this.globalEnvironmentVariables);
  }

  // TODO: deleteAllGlobalEnvVars works in the request lifecycle but does not update the UI.
  // Re-enable once the UI sync issue is resolved.
  // deleteAllGlobalEnvVars() {
  //   for (let key in this.globalEnvironmentVariables) {
  //     if (this.globalEnvironmentVariables.hasOwnProperty(key)) {
  //       delete this.globalEnvironmentVariables[key];
  //     }
  //   }
  // }

  getOauth2CredentialVar(key) {
    return this.interpolate(this.oauth2CredentialVariables[key]);
  }

  resetOauth2Credential(credentialId) {
    if (!credentialId || typeof credentialId !== 'string') {
      throw new Error('credentialId must be a non-empty string');
    }

    if (!this.oauth2CredentialsToReset.includes(credentialId)) {
      this.oauth2CredentialsToReset.push(credentialId);
    }

    // Remove matching credential variables so subsequent getOauth2CredentialVar() calls return undefined
    const prefix = `$oauth2.${credentialId}.`;
    for (const key of Object.keys(this.oauth2CredentialVariables)) {
      if (key.startsWith(prefix)) {
        delete this.oauth2CredentialVariables[key];
      }
    }
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

  getAllVars() {
    return Object.assign({}, this.runtimeVariables);
  }

  getCollectionVar(key) {
    return this.interpolate(this.collectionVariables[key]);
  }

  // TODO: setCollectionVar works in the request lifecycle but does not update the UI.
  // Re-enable once the UI sync issue is resolved.
  // setCollectionVar(key, value) {
  //   if (!key) {
  //     throw new Error('Creating a variable without specifying a name is not allowed.');
  //   }
  //
  //   if (variableNameRegex.test(key) === false) {
  //     throw new Error(
  //       `Variable name: "${key}" contains invalid characters!`
  //       + ' Names must only contain alpha-numeric characters, "-", "_", "."'
  //     );
  //   }
  //
  //   this.collectionVariables[key] = value;
  // }

  hasCollectionVar(key) {
    return Object.hasOwn(this.collectionVariables, key);
  }

  // TODO: deleteCollectionVar works in the request lifecycle but does not update the UI.
  // Re-enable once the UI sync issue is resolved.
  // deleteCollectionVar(key) {
  //   delete this.collectionVariables[key];
  // }

  // TODO: deleteAllCollectionVars works in the request lifecycle but does not update the UI.
  // Re-enable once the UI sync issue is resolved.
  // deleteAllCollectionVars() {
  //   for (let key in this.collectionVariables) {
  //     if (this.collectionVariables.hasOwnProperty(key)) {
  //       delete this.collectionVariables[key];
  //     }
  //   }
  // }

  // TODO: getAllCollectionVars works in the request lifecycle but does not update the UI.
  // Re-enable once the UI sync issue is resolved.
  // getAllCollectionVars() {
  //   return Object.assign({}, this.collectionVariables);
  // }

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
