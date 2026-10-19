const path = require('path');
const { ipcMain } = require('electron');
const {
  cloneGitRepository,
  getCollectionGitRepoUrl,
  listBranchesForRemoteUrl,
  getCollectionGitRootPath,
  getCurrentGitBranch,
  getAheadBehindCount,
  getChangedFilesInCollectionGit,
  getStagedFilePaths,
  initGit,
  stageChanges,
  unstageChanges,
  commitChanges,
  pushGitChanges,
  pullGitChanges
} = require('../utils/git');
const { toReadableGitError } = require('../utils/git-errors');
const { createDirectory, removeDirectory } = require('../utils/filesystem');

const GIT_REMOTE = 'origin';
const PULL_STRATEGIES = ['--ff-only', '--no-rebase'];

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

/*
 * Write operations on one repository run one at a time: two concurrent git commands on the same
 * repository race for .git/index.lock and one of them fails.
 */
const repositoryQueues = new Map();

const runExclusive = (gitRootPath, operation) => {
  const previous = repositoryQueues.get(gitRootPath) || Promise.resolve();
  const current = previous.then(operation);
  const settled = current.catch(() => {});
  repositoryQueues.set(gitRootPath, settled);
  settled.then(() => {
    if (repositoryQueues.get(gitRootPath) === settled) {
      repositoryQueues.delete(gitRootPath);
    }
  });
  return current;
};

const isInsideDirectory = (directory, candidate) => {
  const relativePath = path.relative(directory, candidate);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

/*
 * The renderer only names a collection; the repository root is always resolved here, so a handler
 * can never be pointed at an arbitrary directory.
 */
const resolveCollectionRepository = (collectionWatcher, collectionPath) => {
  if (typeof collectionPath !== 'string' || !collectionPath) {
    throw new Error('Collection path is required');
  }
  if (!collectionWatcher.hasWatcher(collectionPath)) {
    throw new Error('Collection is not open');
  }
  return getCollectionGitRootPath(collectionPath);
};

const requireCollectionRepository = (collectionWatcher, collectionPath) => {
  const gitRootPath = resolveCollectionRepository(collectionWatcher, collectionPath);
  if (!gitRootPath) {
    throw new Error('The collection is not inside a Git repository');
  }
  return gitRootPath;
};

/*
 * Files arrive as paths relative to the repository root (as git status reports them) and must stay
 * inside the collection: changes outside it are never staged from this panel.
 */
const resolveCollectionFiles = ({ collectionPath, gitRootPath, files }) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('At least one file is required');
  }

  return files.map((file) => {
    if (typeof file !== 'string' || !file || file.startsWith('-') || path.isAbsolute(file)) {
      throw new Error(`File path is not valid: ${file}`);
    }
    const absolutePath = path.resolve(gitRootPath, file);
    if (!isInsideDirectory(collectionPath, absolutePath)) {
      throw new Error(`File is outside the collection: ${file}`);
    }
    return absolutePath;
  });
};

const getGitStatus = async ({ collectionWatcher }, { collectionPath } = {}) => {
  const gitRootPath = resolveCollectionRepository(collectionWatcher, collectionPath);
  if (!gitRootPath) {
    return { isRepo: false };
  }

  const [branch, aheadBehind, changes] = await Promise.all([
    getCurrentGitBranch(gitRootPath),
    getAheadBehindCount(gitRootPath),
    getChangedFilesInCollectionGit(gitRootPath, collectionPath)
  ]);

  return {
    isRepo: true,
    branch: branch || null,
    ahead: aheadBehind.ahead,
    behind: aheadBehind.behind,
    staged: changes.staged,
    unstaged: changes.unstaged,
    conflicted: changes.conflicted || [],
    tooManyFiles: changes.tooManyFiles
  };
};

const initGitRepository = async ({ collectionWatcher }, { collectionPath } = {}) => {
  if (resolveCollectionRepository(collectionWatcher, collectionPath)) {
    throw new Error('The collection is already inside a Git repository');
  }
  await initGit(collectionPath);
  return { ok: true };
};

const stageGitFiles = async ({ collectionWatcher }, { collectionPath, files } = {}) => {
  const gitRootPath = requireCollectionRepository(collectionWatcher, collectionPath);
  const absolutePaths = resolveCollectionFiles({ collectionPath, gitRootPath, files });

  await runExclusive(gitRootPath, () => stageChanges(gitRootPath, absolutePaths));
  return { ok: true };
};

const unstageGitFiles = async ({ collectionWatcher }, { collectionPath, files } = {}) => {
  const gitRootPath = requireCollectionRepository(collectionWatcher, collectionPath);
  const absolutePaths = resolveCollectionFiles({ collectionPath, gitRootPath, files });

  await runExclusive(gitRootPath, () => unstageChanges(gitRootPath, absolutePaths));
  return { ok: true };
};

const commitGitChanges = async ({ collectionWatcher }, { collectionPath, message } = {}) => {
  const gitRootPath = requireCollectionRepository(collectionWatcher, collectionPath);
  const commitMessage = typeof message === 'string' ? message.trim() : '';
  if (!commitMessage) {
    throw new Error('Commit message is required');
  }

  return runExclusive(gitRootPath, async () => {
    const stagedPaths = await getStagedFilePaths(gitRootPath);
    if (stagedPaths.length === 0) {
      throw new Error('There are no staged changes to commit');
    }
    const outsideCollection = stagedPaths.filter(
      (file) => !isInsideDirectory(collectionPath, path.resolve(gitRootPath, file))
    );
    if (outsideCollection.length > 0) {
      throw new Error(`Changes outside the collection are staged. Unstage them first: ${outsideCollection.join(', ')}`);
    }

    try {
      const result = await commitChanges(gitRootPath, commitMessage);
      return { hash: result.commit, summary: result.summary };
    } catch (error) {
      throw toReadableGitError(error);
    }
  });
};

const requireSyncTarget = async (gitRootPath, processUid) => {
  if (typeof processUid !== 'string' || !processUid) {
    throw new Error('Process id is required');
  }
  const remoteUrl = await getCollectionGitRemoteUrl(gitRootPath);
  if (!remoteUrl) {
    throw new Error('No remote is configured. Connect a remote repository.');
  }
  const branch = await getCurrentGitBranch(gitRootPath);
  if (!branch) {
    throw new Error('Create a commit before syncing with the remote');
  }
  return branch;
};

const pushGitBranch = async ({ collectionWatcher, mainWindow }, { collectionPath, processUid } = {}) => {
  const gitRootPath = requireCollectionRepository(collectionWatcher, collectionPath);

  await runExclusive(gitRootPath, async () => {
    const branch = await requireSyncTarget(gitRootPath, processUid);
    try {
      await pushGitChanges(mainWindow, { gitRootPath, processUid, remote: GIT_REMOTE, remoteBranch: branch });
    } catch (error) {
      throw toReadableGitError(error);
    }
  });
  return { ok: true };
};

const pullGitBranch = async ({ collectionWatcher, mainWindow }, { collectionPath, processUid, strategy = '--ff-only' } = {}) => {
  const gitRootPath = requireCollectionRepository(collectionWatcher, collectionPath);
  if (!PULL_STRATEGIES.includes(strategy)) {
    throw new Error('Pull strategy is not valid');
  }

  await runExclusive(gitRootPath, async () => {
    const branch = await requireSyncTarget(gitRootPath, processUid);
    try {
      await pullGitChanges(mainWindow, { gitRootPath, processUid, remote: GIT_REMOTE, remoteBranch: branch, strategy });
    } catch (error) {
      throw toReadableGitError(error);
    }
  });
  return { ok: true };
};

const registerGitIpc = (mainWindow, collectionWatcher) => {
  const context = { mainWindow, collectionWatcher };

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

  ipcMain.handle('renderer:git-status', (event, args) => getGitStatus(context, args));
  ipcMain.handle('renderer:git-init', (event, args) => initGitRepository(context, args));
  ipcMain.handle('renderer:git-stage', (event, args) => stageGitFiles(context, args));
  ipcMain.handle('renderer:git-unstage', (event, args) => unstageGitFiles(context, args));
  ipcMain.handle('renderer:git-commit', (event, args) => commitGitChanges(context, args));
  ipcMain.handle('renderer:git-push', (event, args) => pushGitBranch(context, args));
  ipcMain.handle('renderer:git-pull', (event, args) => pullGitBranch(context, args));
};

module.exports = registerGitIpc;
module.exports.getCollectionGitRemoteUrl = getCollectionGitRemoteUrl;
module.exports.handleListRemoteBranches = handleListRemoteBranches;
module.exports.runExclusive = runExclusive;
module.exports.resolveCollectionFiles = resolveCollectionFiles;
module.exports.getGitStatus = getGitStatus;
module.exports.initGitRepository = initGitRepository;
module.exports.stageGitFiles = stageGitFiles;
module.exports.unstageGitFiles = unstageGitFiles;
module.exports.commitGitChanges = commitGitChanges;
module.exports.pushGitBranch = pushGitBranch;
module.exports.pullGitBranch = pullGitBranch;
