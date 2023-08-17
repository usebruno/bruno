
class Bru {
  constructor(envVariables, collectionVariables) {
    this._envVariables = envVariables;
    this._collectionVariables = collectionVariables;
  }

  getProcessEnv(key) {
    return process.env[key];
  }

  getEnvVar(key) {
    return this._envVariables[key];
  }

  setEnvVar(key, value) {
    if(!key) {
      throw new Error('Key is required');
    }

    // gracefully ignore if key is not present in environment
    if(!this._envVariables.hasOwnProperty(key)) {
       return;
    }

    this._envVariables[key] = value;
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
