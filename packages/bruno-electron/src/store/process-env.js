/**
 * This file stores all the process.env variables under collection scope
 *
 * process.env variables are sourced in the following order, where each source overrides the previous one:
 * 1. process.env variables set in the OS, applied as global vars for the collection
 * 2. .env file in the root of the project, applied as global vars for the collection
 * 3. .env.{env-name} in the root of the project, applied as environment specific vars for the collection
 *
 * Multiple collections can be opened in the same electron app.
 * Each collection's .env files can have different values for the same process.env variable.
 */

const dotEnvVars = {};

// collectionUid is a hash based on the collection path
const getProcessEnvVars = (collectionUid, envName) => {
  // return the process.env merged with the global .env vars (if any) and the env specific .env vars (if any)
  const envVars = {
    ...process.env,
    ...dotEnvVars[collectionUid].global,
    ...dotEnvVars[collectionUid].envs[envName]
  };
  return envVars;
};

const setDotEnvVars = (collectionUid, envName, envVars) => {
  // Initialize collection if it doesn't exist
  if (!dotEnvVars[collectionUid]) {
    dotEnvVars[collectionUid] = { global: {}, envs: {} };
  }
  
  if (envName === null) {
    // Set global environment variables
    dotEnvVars[collectionUid].global = envVars;
  } else {
    // Set environment-specific variables
    dotEnvVars[collectionUid].envs[envName] = envVars;
  }
};

module.exports = {
  getProcessEnvVars,
  setDotEnvVars
};
