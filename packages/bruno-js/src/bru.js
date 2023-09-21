class Bru {
  constructor(envVariables, collectionVariables) {
    this.envVariables = envVariables;
    this.collectionVariables = collectionVariables;
  }

  getEnvName() {
    return this.envVariables.__name__;
  }

  getProcessEnv(key) {
    return process.env[key];
  }

  getEnvVar(key) {
    return this.envVariables[key];
  }

  setEnvVar(key, value) {
    if (!key) {
      throw new Error('Key is required');
    }

    // gracefully ignore if key is not present in environment
    if (!this.envVariables.hasOwnProperty(key)) {
      return;
    }

    this.envVariables[key] = value;
  }

  setVar(key, value) {
    if (!key) {
      throw new Error('Key is required');
    }

    this.collectionVariables[key] = value;
  }

  getVar(key) {
    return this.collectionVariables[key];
  }
}

module.exports = Bru;
