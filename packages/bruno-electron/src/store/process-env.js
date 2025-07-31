/**
 * This file stores all the process.env variables under collection scope
 *
 * process.env variables are sourced from 2 places:
 * 1. .env file in the root of the project
 * 2. process.env variables set in the OS
 *
 * Multiple collections can be opened in the same electron app.
 * Each collection's .env file can have different values for the same process.env variable.
 */

// dotEnvVars[collectionUid] can be:
// - an object of env vars (for default env)
// - an object mapping env name to env vars (for multiple envs)
const dotEnvVars = {};

// collectionUid is a hash based on the collection path
const getProcessEnvVars = (collectionUid, env) => {
  const envVars = dotEnvVars[collectionUid];
  if (!envVars) {
    return { ...process.env };
  }
  // If env is set and envVars is an object of envs
  if (env && typeof envVars === 'object' && envVars[env]) {
    return {
      ...process.env,
      ...envVars[env]
    };
  }
  // If envVars is a flat object (default env)
  if (!env || (typeof envVars !== 'object' || Array.isArray(envVars))) {
    return {
      ...process.env,
      ...envVars
    };
  }
  // If env is set but not found, fallback to process.env
  return { ...process.env };
};

const setDotEnvVars = (collectionUid, envVars, env) => {
  if (env) {
    if (!dotEnvVars[collectionUid] || typeof dotEnvVars[collectionUid] !== 'object' || Array.isArray(dotEnvVars[collectionUid])) {
      dotEnvVars[collectionUid] = {};
    }
    dotEnvVars[collectionUid][env] = envVars;
  } else {
    dotEnvVars[collectionUid] = envVars;
  }
};

module.exports = {
  getProcessEnvVars,
  setDotEnvVars
};
