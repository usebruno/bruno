const { ipcMain } = require('electron');
const { cloneGitRepository, getCollectionGitRepoUrl, listBranchesForRemoteUrl } = require('../utils/git');
const { createDirectory, removeDirectory } = require('../utils/filesystem');

const getCollectionGitRemoteUrl = async (collectionPath) => {
  try {
    const url = await getCollectionGitRepoUrl(collectionPath);
    return url || null;
  } catch (error) {
    return null;
  }
};

const handleListRemoteBranches = async (event, { url }) => {
  const repositoryUrl = typeof url === 'string' ? url.trim() : '';
  if (!repositoryUrl) {
    throw new Error('Repository URL is required');
  }
  // git reads a dash-leading url as a command option, not a repository
  if (repositoryUrl.startsWith('-')) {
    throw new Error('Repository URL is not valid');
  }

  return listBranchesForRemoteUrl({ url: repositoryUrl });
};

const registerGitIpc = (mainWindow) => {
  ipcMain.handle('renderer:clone-git-repository', async (event, { url, path, processUid, branch }) => {
    let directoryCreated = false;
    try {
      await createDirectory(path);
      directoryCreated = true;
      await cloneGitRepository(mainWindow, { url, path, processUid, branch });
      return 'Repository cloned successfully';
    } catch (error) {
      if (directoryCreated) {
        await removeDirectory(path);
      }
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-collection-git-remote-url', (event, collectionPath) =>
    getCollectionGitRemoteUrl(collectionPath)
  );

  ipcMain.handle('renderer:list-remote-branches-for-url', handleListRemoteBranches);
};

module.exports = registerGitIpc;
module.exports.getCollectionGitRemoteUrl = getCollectionGitRemoteUrl;
module.exports.handleListRemoteBranches = handleListRemoteBranches;
