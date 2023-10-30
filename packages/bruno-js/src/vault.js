const { get } = require('lodash');
const NodeVault = require('node-vault');
const fs = require('fs');

class Vault {
  endpoint = null;
  token = null;
  nodeVault = null;
  cache = null;
  cacheTimeout = null;
  pathPrefix = null;
  proxy = null;
  static instance = null;

  constructor(endpoint, tokenFilePath, pathPrefix, proxy) {
    this.tokenFilePath = tokenFilePath;
    this.endpoint = endpoint;
    this.pathPrefix = pathPrefix;
    this.nodeVault = null;
    this.cache = {};
    this.cacheTimeout = 120;
    this.proxy = proxy;
  }

  getToken = () => {
    if (this.token) {
      return this.token;
    }

    if (!this.tokenFilePath) {
      return null;
    }

    try {
      this.token = fs.readFileSync(this.tokenFilePath).toString();
    } catch (e) {}

    return this.token;
  };

  getNodeVault = () => {
    if (this.nodeVault) {
      return this.nodeVault;
    }

    this.nodeVault = NodeVault({
      endpoint: this.endpoint,
      token: this.getToken(),
      requestOptions: {
        proxy: this.proxy
      }
    });

    return this.nodeVault;
  };

  static getVault = (envVars = {}) => {
    const {
      VAULT_ADDR: vaultAddr,
      VAULT_TOKEN_FILE_PATH: vaultTokenFilePath,
      VAULT_PATH_PREFIX: pathPrefix,
      VAULT_PROXY: proxy
    } = envVars;
    if (!vaultAddr || !vaultTokenFilePath) {
      return null;
    }

    if (
      this.instance &&
      vaultAddr === this.instance.endpoint &&
      vaultTokenFilePath === this.instance.tokenFilePath &&
      pathPrefix === this.instance.pathPrefix &&
      proxy === this.instance.proxy
    ) {
      return this.instance;
    }

    this.instance = new Vault(vaultAddr, vaultTokenFilePath, pathPrefix, proxy);

    return this.instance;
  };

  getValueFromCache = (key, jsonPath = '') => {
    if (
      this.cache[key] != null &&
      new Date().getTime() - this.cache[key].creationDate.getTime() < this.cacheTimeout * 1000
    ) {
      let cachedValue = this.cache[key].value;

      if (jsonPath && typeof cachedValue === 'object') {
        cachedValue = get(this.cache[key].value, jsonPath, 'Undefined key');
      }

      if (typeof cachedValue === 'object') {
        cachedValue = JSON.stringify(cachedValue, null, '\t');
      }

      return cachedValue;
    }

    return null;
  };

  putValueInCache = (key, value) => {
    this.cache[key] = {
      key,
      value,
      creationDate: new Date()
    };
  };

  clearCache = (key) => {
    if (key) {
      delete this.cache[key];
    }
  };

  getFullPath = (path) => {
    if (this.pathPrefix) {
      return `${this.pathPrefix}${path}`;
    }

    return path;
  };

  replaceEnvVariables = (str, env = {}) => {
    if (!str || !str.length || typeof str !== 'string' || !str.includes('[env.')) {
      return str;
    }

    const regex = /\[env\.(?<variableName>[^\]]*)]/g;
    const matches = str.matchAll(regex);
    if (!matches) {
      return str;
    }

    for (const match of matches) {
      const { variableName } = match.groups;
      if (!env.hasOwnProperty(variableName)) {
        throw new Error(`Environment variable ${variableName} not found`);
      }

      const value = env[variableName];
      str = str.replace(match[0], value);
    }

    return str;
  };

  read = async (path, jsonPath, env = {}) => {
    if (!this.getNodeVault() || !path) {
      return null;
    }

    path = this.getFullPath(path);

    try {
      path = this.replaceEnvVariables(path, env);
      jsonPath = this.replaceEnvVariables(jsonPath, env);
    } catch (e) {
      return e.message;
    }

    const cachedValue = this.getValueFromCache(path, jsonPath);
    if (cachedValue) {
      return cachedValue;
    }

    let response;
    let value;
    try {
      response = await this.getNodeVault().read(path);
      this.putValueInCache(path, response.data.data);
    } catch (e) {
      if (e.response && e.response.body.errors && e.response.body.errors.length > 0) {
        return `Vault error ${e.response?.statusCode ?? ''} : ${e.response.body.errors.join('\n')}`;
      }

      return 'Error reading vault path';
    }

    if (!jsonPath) {
      value = response.data.data;
    } else {
      value = get(response.data.data, jsonPath, null);

      if (!value) {
        return 'Undefined key';
      }
    }

    if (typeof value === 'object') {
      value = JSON.stringify(value, null, '\t');
    }

    return value;
  };

  replaceVariables = async (str, envVars = {}) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const matches = str.matchAll(Vault.getVariableRegex());
    if (!matches) {
      return str;
    }

    for (const match of matches) {
      const { path, jsonPath } = match.groups;
      const value = await this.read(path, jsonPath, envVars);
      str = str.replace(match[0], value);
    }

    return str;
  };

  static getVariableRegex = () => /{{vault\s?\|(?<path>[^|]*)(\s?\|(?<jsonPath>[^|}]*))?}}/g;
  static getVariableInnerRegex = () => /vault\s?\|(?<path>[^|]*)(\s?\|(?<jsonPath>[^|}]*))?/;
}

module.exports = Vault;
