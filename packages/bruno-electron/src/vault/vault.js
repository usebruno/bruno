const { get } = require('lodash');
const NodeVault = require('node-vault');
const fs = require('fs');
const { vaultVariableRegex } = require('@usebruno/app/src/utils/vault');

class Vault {
  endpoint = null;
  token = null;
  vault = null;
  cache = null;
  cacheTimeout = null;
  pathPrefix = null;

  constructor(endpoint, tokenFilePath, pathPrefix) {
    this.tokenFilePath = tokenFilePath;
    this.endpoint = endpoint;
    this.pathPrefix = pathPrefix;
    this.vault = null;
    this.cache = {};
    this.cacheTimeout = 120;
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

  getVault = () => {
    if (this.vault) {
      return this.vault;
    }

    this.vault = NodeVault({
      endpoint: this.endpoint,
      token: this.getToken()
    });

    return this.vault;
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

  read = async (path, jsonPath) => {
    path = this.getFullPath(path);
    if (!this.getVault() || !path) {
      return null;
    }

    const cachedValue = this.getValueFromCache(path, jsonPath);
    if (cachedValue) {
      return cachedValue;
    }

    let response;
    let value;
    try {
      response = await this.getVault().read(path);
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

  replaceVariables = async (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const matches = str.matchAll(vaultVariableRegex);
    if (!matches) {
      return str;
    }

    for (const match of matches) {
      const { path, jsonPath } = match.groups;
      const value = await this.read(path, jsonPath);
      str = str.replace(match[0], value);
    }

    return str;
  };
}

let vault = null;
const getVault = (envVars = {}) => {
  const { VAULT_ADDR: vaultAddr, VAULT_TOKEN_FILE_PATH: vaultTokenFilePath, VAULT_PATH_PREFIX: pathPrefix } = envVars;
  if (!vaultAddr || !vaultTokenFilePath) {
    return null;
  }

  if (
    vault &&
    vaultAddr === vault.endpoint &&
    vaultTokenFilePath === vault.tokenFilePath &&
    pathPrefix === vault.pathPrefix
  ) {
    return vault;
  }

  vault = new Vault(vaultAddr, vaultTokenFilePath, pathPrefix);

  return vault;
};

module.exports = {
  Vault,
  getVault
};
