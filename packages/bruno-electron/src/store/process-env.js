/**
 * This file stores all the process.env variables under collection and workspace scope
 *
 * process.env variables are sourced from 3 places:
 * 1. .env file in the workspace root
 * 2. .env file in the collection root
 * 3. process.env variables set in the OS
 *
 * Priority (highest to lowest): collection .env > workspace .env > OS process.env
 *
 * Multiple collections can be opened in the same electron app.
 * Each collection's .env file can have different values for the same process.env variable.
 */

const dotEnvVars = {};
const workspaceDotEnvVars = {};
const collectionWorkspaceMap = {};

// collectionUid is a hash based on the collection path
const getProcessEnvVars = (collectionUid) => {
  const workspacePath = collectionWorkspaceMap[collectionUid];
  const workspaceEnvVars = workspacePath ? workspaceDotEnvVars[workspacePath] : {};

  return {
    ...process.env,
    ...workspaceEnvVars,
    ...dotEnvVars[collectionUid]
  };
};

const setDotEnvVars = (collectionUid, envVars) => {
  dotEnvVars[collectionUid] = envVars;
};

const setWorkspaceDotEnvVars = (workspacePath, envVars) => {
  workspaceDotEnvVars[workspacePath] = envVars;
};

const clearWorkspaceDotEnvVars = (workspacePath) => {
  delete workspaceDotEnvVars[workspacePath];
};

const setCollectionWorkspace = (collectionUid, workspacePath) => {
  collectionWorkspaceMap[collectionUid] = workspacePath;
};

const clearCollectionWorkspace = (collectionUid) => {
  delete collectionWorkspaceMap[collectionUid];
};

module.exports = {
  getProcessEnvVars,
  setDotEnvVars,
  setWorkspaceDotEnvVars,
  clearWorkspaceDotEnvVars,
  setCollectionWorkspace,
  clearCollectionWorkspace
};
