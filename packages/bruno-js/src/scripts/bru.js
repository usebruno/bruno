class Bru {
  constructor(environment) {
    this._environment = environment;
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
}

module.exports = Bru;