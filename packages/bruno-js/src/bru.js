const { cloneDeep } = require('lodash');
const { interpolate } = require('@usebruno/common');

const variableNameRegex = /^[\w-.]*$/;

class Bru {
  constructor(request, envVariables, runtimeVariables, processEnvVars, collectionPath, collectionVariables, folderVariables, requestVariables, globalEnvironmentVariables, cookieJar) {
    this.envVariables = envVariables || {};
    this.runtimeVariables = runtimeVariables || {};
    this.processEnvVars = cloneDeep(processEnvVars || {});
    this.collectionVariables = collectionVariables || {};
    this.folderVariables = folderVariables || {};
    this.requestVariables = requestVariables || {};
    this.globalEnvironmentVariables = globalEnvironmentVariables || {};
    this.collectionPath = collectionPath;
    this.url = request.url;
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
    }
    this.cookieJar = cookieJar();    
    this.cookies = {
      jar: () => ({
        get: (url, cookieName, callback = () => {}) => {
          const interpolatedUrl = this._interpolate(url);
          if (!interpolatedUrl || !cookieName) {
            throw new Error("URL and cookie name are required.");
          }
          return this.cookieJar.get(interpolatedUrl, cookieName, callback);
        },
        getAll: (url, callback = () => {}) => {
          const interpolatedUrl = this._interpolate(url);
          if (!interpolatedUrl) {
            throw new Error("URL is required.");
          }
          return this.cookieJar.getAll(interpolatedUrl, callback);
        },
        set: (url, cookieName, cookieValue, options = {}, callback = () => {}) => {
          const interpolatedUrl = this._interpolate(url);
          if (!interpolatedUrl || !cookieName || cookieValue === undefined) {
            throw new Error("URL, cookie name and value are required.");
          }
          return this.cookieJar.set(interpolatedUrl, cookieName, cookieValue, options, callback);
        },
        unset: (url, cookieName, callback = () => {}) => {
          const interpolatedUrl = this._interpolate(url);
          if (!interpolatedUrl || !cookieName) {
            throw new Error("URL and cookie name are required.");
          }
          this.cookieJar.unset(interpolatedUrl, cookieName, callback);
        },
        clear: (url, callback = () => {}) => {
          const interpolatedUrl = this._interpolate(url);
          if (!interpolatedUrl) {
            throw new Error("URL is required.");
          }
          this.cookieJar.clear(interpolatedUrl, callback);
        },
        has: (url, cookieName, callback = () => {}) => {
          const interpolatedUrl = this._interpolate(url);
          if (!interpolatedUrl || !cookieName) {
            throw new Error("URL and cookie name are required.");
          }
          this.cookieJar.get(interpolatedUrl, cookieName, (err, cookie) => {
            if (err) {
              callback(err, false);
            } else {
              callback(null, !!cookie);
            }
          });
        }
      }),
      get: (cookieName) => {
        const interpolatedUrl = this._interpolate(this.url);
        if (!interpolatedUrl || !cookieName) {
          throw new Error("URL and cookie name are required.");
        }
        const cookies = this.cookieJar.getSync(interpolatedUrl);
        const cookie = cookies.find(cookie => cookie.key === cookieName);
        return cookie ? cookie.value : null;
      },
      has: (cookieName) => {
        const interpolatedUrl = this._interpolate(this.url);
        if (!interpolatedUrl || !cookieName) {
          throw new Error("URL and cookie name are required.");
        }
        const cookies = this.cookieJar.getSync(interpolatedUrl);
        return cookies.some(cookie => cookie.key === cookieName);
      },
      toObject: () => {
        const interpolatedUrl = this._interpolate(this.url);
        if (!interpolatedUrl) {
          throw new Error("URL is required.");
        }
        const cookies = this.cookieJar.getSync(interpolatedUrl);
        return cookies.reduce((cookieObj, cookie) => {
          cookieObj[cookie.key] = cookie.value;
          return cookieObj;
        }, {});
      }      
    };
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
}

module.exports = Bru;
