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

const dotEnvVars = {};

// collectionUid is a hash based on the collection path
const getProcessEnvVars = (collectionUid) => {
  // if there are no .env vars for this collection, return the process.env
  if (!dotEnvVars[collectionUid]) {
    return {
      ...process.env
    };
  }

  // if there are .env vars for this collection, return the process.env merged with the .env vars
  return {
    ...process.env,
    ...dotEnvVars[collectionUid]
  };
};

const setDotEnvVars = (collectionUid, envVars) => {
  dotEnvVars[collectionUid] = envVars;
};

module.exports = {
  getProcessEnvVars,
  setDotEnvVars
};
