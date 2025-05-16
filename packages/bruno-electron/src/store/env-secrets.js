const _ = require('lodash');
const Store = require('electron-store');
const { encryptString } = require('../utils/encryption');
const { isValidValue } = require('../utils/common');

/**
 * Sample secrets store file
 *
 * {
 *   "collections": [{
 *     "path": "/Users/anoop/Code/acme-acpi-collection",
 *     "environments" : [{
 *       "name": "Local",
 *       "secrets": [{
 *         "name": "token",
 *         "value": "abracadabra"
 *       }]
 *     }]
 *   }]
 * }
 */

class EnvironmentSecretsStore {
  constructor() {
    this.store = new Store({
      name: 'secrets',
      clearInvalidConfig: true
    });
  }

  storeEnvSecrets(collectionPathname, environment) {
    const envVars = [];
    _.each(environment.variables, (v) => {
      if (v.secret) {
        envVars.push({
          name: v.name,
          value: isValidValue(v.value) ? encryptString(v.value) : ''
        });
      }
    });

    const collections = this.store.get('collections') || [];
    const collection = _.find(collections, (c) => c.path === collectionPathname);

    // if collection doesn't exist, create it, add the environment and save
    if (!collection) {
      collections.push({
        path: collectionPathname,
        environments: [
          {
            name: environment.name,
            secrets: envVars
          }
        ]
      });

      this.store.set('collections', collections);
      return;
    }

    // if collection exists, check if environment exists
    // if environment doesn't exist, add the environment and save
    collection.environments = collection.environments || [];
    const env = _.find(collection.environments, (e) => e.name === environment.name);
    if (!env) {
      collection.environments.push({
        name: environment.name,
        secrets: envVars
      });

      this.store.set('collections', collections);
      return;
    }

    // if environment exists, update the secrets and save
    env.secrets = envVars;
    this.store.set('collections', collections);
  }

  getEnvSecrets(collectionPathname, environment) {
    const collections = this.store.get('collections') || [];
    const collection = _.find(collections, (c) => c.path === collectionPathname);
    if (!collection) {
      return [];
    }

    const env = _.find(collection.environments, (e) => e.name === environment.name);
    if (!env) {
      return [];
    }

    return env.secrets || [];
  }

  renameEnvironment(collectionPathname, oldName, newName) {
    const collections = this.store.get('collections') || [];
    const collection = _.find(collections, (c) => c.path === collectionPathname);
    if (!collection) {
      return;
    }

    const env = _.find(collection.environments, (e) => e.name === oldName);
    if (!env) {
      return;
    }

    env.name = newName;
    this.store.set('collections', collections);
  }

  deleteEnvironment(collectionPathname, environmentName) {
    const collections = this.store.get('collections') || [];
    const collection = _.find(collections, (c) => c.path === collectionPathname);
    if (!collection) {
      return;
    }

    _.remove(collection.environments, (e) => e.name === environmentName);
    this.store.set('collections', collections);
  }
}

module.exports = EnvironmentSecretsStore;
