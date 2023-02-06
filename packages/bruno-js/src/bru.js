
class Bru {
  constructor(environment, collectionVariables) {
    this._environment = environment;
    this._collectionVariables = collectionVariables;
  }

  getEnvVar(key) {
    return this._environment[key];
  }

  setEnvVar(key, value) {
    if(!key) {
      throw new Error('Key is required');
    }

    // gracefully ignore if key is not present in environment
    if(!this._environment.hasOwnProperty(key)) {
      return;
    }

    this._environment[key] = value;
  }

  setVar(key, value) {
    if(!key) {
      throw new Error('Key is required');
    }

    this._collectionVariables[key] = value;
  }

  getVar(key) {
    return this._collectionVariables[key];
  }
}

module.exports = Bru;