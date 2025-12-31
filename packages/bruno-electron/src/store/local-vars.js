const _ = require('lodash');
const path = require('path');
const Store = require('electron-store');

/**
 * LocalVarsStore - Stores non-persistent pre-request variables
 *
 * These variables are marked with persist: false in the UI
 * and are stored locally (not in .bru files) to avoid git tracking.
 *
 * Sample store structure:
 * {
 *   "requests": [{
 *     "pathname": "/Users/user/collection/Get Users.bru",
 *     "vars": [{
 *       "uid": "abc123",
 *       "name": "id",
 *       "value": "51",
 *       "enabled": true
 *     }]
 *   }]
 * }
 */

class LocalVarsStore {
  constructor() {
    this.store = new Store({
      name: 'local-vars',
      clearInvalidConfig: true
    });
  }

  /**
   * Store non-persistent variables for a request
   * @param {string} requestPathname - Full path to the .bru file
   * @param {Array} vars - Array of variable objects with uid, name, value, enabled
   */
  storeLocalVars(requestPathname, vars) {
    const requests = this.store.get('requests') || [];
    const existingRequest = _.find(requests, (r) => r.pathname === requestPathname);
    const safeVars = Array.isArray(vars) ? vars : [];

    // Filter and clean vars for storage
    const varsToStore = safeVars.map((v) => ({
      uid: v.uid,
      name: v.name,
      value: v.value,
      enabled: v.enabled !== false
    }));

    if (!existingRequest) {
      // Add new request entry if vars exist
      if (varsToStore.length > 0) {
        requests.push({
          pathname: requestPathname,
          vars: varsToStore
        });
        this.store.set('requests', requests);
      }
      return;
    }

    // Update existing request
    if (varsToStore.length > 0) {
      existingRequest.vars = varsToStore;
    } else {
      // Remove request entry if no vars left
      _.remove(requests, (r) => r.pathname === requestPathname);
    }

    this.store.set('requests', requests);
  }

  /**
   * Get non-persistent variables for a request
   * @param {string} requestPathname - Full path to the .bru file
   * @returns {Array} Array of variable objects
   */
  getLocalVars(requestPathname) {
    const requests = this.store.get('requests') || [];
    const request = _.find(requests, (r) => r.pathname === requestPathname);

    if (!request) {
      return [];
    }

    return request.vars || [];
  }

  /**
   * Delete local variables when a request is deleted
   * @param {string} requestPathname - Full path to the .bru file
   */
  deleteLocalVars(requestPathname) {
    const requests = this.store.get('requests') || [];
    _.remove(requests, (r) => r.pathname === requestPathname);
    this.store.set('requests', requests);
  }

  /**
   * Update pathname when a request file is renamed/moved
   * @param {string} oldPathname - Old path to the .bru file
   * @param {string} newPathname - New path to the .bru file
   */
  moveLocalVars(oldPathname, newPathname) {
    const requests = this.store.get('requests') || [];
    const request = _.find(requests, (r) => r.pathname === oldPathname);

    if (request) {
      request.pathname = newPathname;
      this.store.set('requests', requests);
    }
  }

  /**
   * Get all local vars for requests within a collection path
   * Useful for bulk operations on collections
   * @param {string} collectionPath - Path to the collection folder
   * @returns {Array} Array of request objects with their local vars
   */
  getLocalVarsForCollection(collectionPath) {
    const requests = this.store.get('requests') || [];
    return requests.filter((r) => r.pathname === collectionPath || r.pathname.startsWith(collectionPath + path.sep));
  }

  /**
   * Delete all local vars for a collection
   * @param {string} collectionPath - Path to the collection folder
   */
  deleteLocalVarsForCollection(collectionPath) {
    const requests = this.store.get('requests') || [];
    const filteredRequests = requests.filter((r) => !(r.pathname === collectionPath || r.pathname.startsWith(collectionPath + path.sep)));
    this.store.set('requests', filteredRequests);
  }
}

module.exports = LocalVarsStore;
