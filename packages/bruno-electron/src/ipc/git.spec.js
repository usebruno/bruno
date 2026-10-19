jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));
jest.mock('../utils/git', () => ({
  cloneGitRepository: jest.fn(),
  getCollectionGitRepoUrl: jest.fn(),
  listBranchesForRemoteUrl: jest.fn(),
  getCollectionGitRootPath: jest.fn(),
  getCurrentGitBranch: jest.fn(),
  getAheadBehindCount: jest.fn(),
  getChangedFilesInCollectionGit: jest.fn(),
  getStagedFilePaths: jest.fn(),
  initGit: jest.fn(),
  stageChanges: jest.fn(),
  unstageChanges: jest.fn(),
  commitChanges: jest.fn(),
  pushGitChanges: jest.fn(),
  pullGitChanges: jest.fn()
}));
jest.mock('../utils/filesystem', () => ({
  createDirectory: jest.fn(),
  removeDirectory: jest.fn()
}));

const path = require('path');
const gitUtils = require('../utils/git');
const { getCollectionGitRepoUrl, listBranchesForRemoteUrl } = gitUtils;
const {
  getCollectionGitRemoteUrl,
  handleListRemoteBranches,
  runExclusive,
  resolveCollectionFiles,
  getGitStatus,
  initGitRepository,
  stageGitFiles,
  commitGitChanges,
  pushGitBranch,
  pullGitBranch
} = require('./git');

describe('getCollectionGitRemoteUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the origin url for the collection path', async () => {
    getCollectionGitRepoUrl.mockResolvedValue('https://github.com/org/repo.git');

    expect(await getCollectionGitRemoteUrl('/tmp/repo/collection')).toBe('https://github.com/org/repo.git');
    expect(getCollectionGitRepoUrl).toHaveBeenCalledWith('/tmp/repo/collection');
  });

  it('maps an empty remote url to null', async () => {
    getCollectionGitRepoUrl.mockResolvedValue('');

    expect(await getCollectionGitRemoteUrl('/tmp/repo')).toBeNull();
  });

  it('returns null when the collection is not a git repo (lookup throws)', async () => {
    getCollectionGitRepoUrl.mockRejectedValue(new Error('not a git repository'));

    expect(await getCollectionGitRemoteUrl('/tmp/not-a-repo')).toBeNull();
  });
});

describe('handleListRemoteBranches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the branch listing for the url', async () => {
    listBranchesForRemoteUrl.mockResolvedValue({ branches: ['main', 'develop'], defaultBranch: 'main' });

    expect(await handleListRemoteBranches({}, { url: '  https://github.com/org/repo.git  ' })).toEqual({
      branches: ['main', 'develop'],
      defaultBranch: 'main'
    });
    expect(listBranchesForRemoteUrl).toHaveBeenCalledWith({ url: 'https://github.com/org/repo.git' });
  });

  it('rejects a missing url', async () => {
    await expect(handleListRemoteBranches({}, { url: '   ' })).rejects.toThrow('Repository URL is required');
    expect(listBranchesForRemoteUrl).not.toHaveBeenCalled();
  });

  it('rejects a url that git would read as a command option', async () => {
    await expect(handleListRemoteBranches({}, { url: '--upload-pack=touch /tmp/pwned' }))
      .rejects.toThrow('Repository URL is not valid');
    expect(listBranchesForRemoteUrl).not.toHaveBeenCalled();
  });
});

const repoRoot = path.resolve('/workspace/repo');
const collectionPath = path.join(repoRoot, 'collections', 'api');
const openCollections = (...paths) => ({ hasWatcher: (candidate) => paths.includes(candidate) });
const context = { collectionWatcher: openCollections(collectionPath), mainWindow: {} };

describe('resolveCollectionFiles', () => {
  it('resolves repository-relative paths inside the collection to absolute paths', () => {
    expect(resolveCollectionFiles({ collectionPath, gitRootPath: repoRoot, files: ['collections/api/get-user.bru'] }))
      .toEqual([path.join(collectionPath, 'get-user.bru')]);
  });

  it.each([
    ['a file outside the collection', 'collections/other/outside.bru', 'outside the collection'],
    ['a path that climbs out with ..', 'collections/api/../../README.md', 'outside the collection'],
    ['the collection folder itself', 'collections/api', 'outside the collection'],
    ['a dash-leading path git would read as an option', '--exec=touch /tmp/pwned', 'not valid'],
    ['an absolute path', path.join(collectionPath, 'get-user.bru'), 'not valid']
  ])('rejects %s', (label, file, message) => {
    expect(() => resolveCollectionFiles({ collectionPath, gitRootPath: repoRoot, files: [file] })).toThrow(message);
  });

  it('rejects an empty file list', () => {
    expect(() => resolveCollectionFiles({ collectionPath, gitRootPath: repoRoot, files: [] })).toThrow('At least one file');
  });
});

describe('git panel handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(repoRoot);
  });

  it('refuses a collection that is not open', async () => {
    await expect(getGitStatus(context, { collectionPath: path.resolve('/etc') })).rejects.toThrow('Collection is not open');
    expect(gitUtils.getCollectionGitRootPath).not.toHaveBeenCalled();
  });

  it('reports a collection outside any repository without failing', async () => {
    gitUtils.getCollectionGitRootPath.mockReturnValue(null);

    expect(await getGitStatus(context, { collectionPath })).toEqual({ isRepo: false });
  });

  it('combines branch, ahead/behind and the collection changes into the status', async () => {
    gitUtils.getCurrentGitBranch.mockResolvedValue('main');
    gitUtils.getAheadBehindCount.mockResolvedValue({ ahead: 2, behind: 1 });
    gitUtils.getChangedFilesInCollectionGit.mockResolvedValue({
      staged: [{ path: 'collections/api/a.bru' }],
      unstaged: [],
      conflicted: [],
      tooManyFiles: false
    });

    expect(await getGitStatus(context, { collectionPath })).toEqual({
      isRepo: true,
      branch: 'main',
      ahead: 2,
      behind: 1,
      staged: [{ path: 'collections/api/a.bru' }],
      unstaged: [],
      conflicted: [],
      tooManyFiles: false
    });
    expect(gitUtils.getChangedFilesInCollectionGit).toHaveBeenCalledWith(repoRoot, collectionPath);
  });

  it('does not initialise a repository inside an existing one', async () => {
    await expect(initGitRepository(context, { collectionPath })).rejects.toThrow('already inside a Git repository');
    expect(gitUtils.initGit).not.toHaveBeenCalled();
  });

  it('stages files by absolute path', async () => {
    await stageGitFiles(context, { collectionPath, files: ['collections/api/a.bru'] });

    expect(gitUtils.stageChanges).toHaveBeenCalledWith(repoRoot, [path.join(collectionPath, 'a.bru')]);
  });

  it('rejects an empty commit message', async () => {
    await expect(commitGitChanges(context, { collectionPath, message: '   ' })).rejects.toThrow('Commit message is required');
    expect(gitUtils.commitChanges).not.toHaveBeenCalled();
  });

  it('refuses to commit when changes outside the collection are staged', async () => {
    gitUtils.getStagedFilePaths.mockResolvedValue(['collections/api/a.bru', 'README.md']);

    await expect(commitGitChanges(context, { collectionPath, message: 'update' })).rejects.toThrow('README.md');
    expect(gitUtils.commitChanges).not.toHaveBeenCalled();
  });

  it('commits the staged collection changes', async () => {
    gitUtils.getStagedFilePaths.mockResolvedValue(['collections/api/a.bru']);
    gitUtils.commitChanges.mockResolvedValue({ commit: 'abc123', summary: { changes: 1 } });

    expect(await commitGitChanges(context, { collectionPath, message: '  update  ' })).toEqual({
      hash: 'abc123',
      summary: { changes: 1 }
    });
    expect(gitUtils.commitChanges).toHaveBeenCalledWith(repoRoot, 'update');
  });

  it('pushes the current branch to origin', async () => {
    getCollectionGitRepoUrl.mockResolvedValue('https://github.com/org/repo.git');
    gitUtils.getCurrentGitBranch.mockResolvedValue('main');

    await pushGitBranch(context, { collectionPath, processUid: 'p1' });

    expect(gitUtils.pushGitChanges).toHaveBeenCalledWith(context.mainWindow, {
      gitRootPath: repoRoot,
      processUid: 'p1',
      remote: 'origin',
      remoteBranch: 'main'
    });
  });

  it('explains a push without a configured remote', async () => {
    getCollectionGitRepoUrl.mockResolvedValue('');

    await expect(pushGitBranch(context, { collectionPath, processUid: 'p1' })).rejects.toThrow('No remote is configured');
    expect(gitUtils.pushGitChanges).not.toHaveBeenCalled();
  });

  it('turns an authentication failure into a readable error', async () => {
    getCollectionGitRepoUrl.mockResolvedValue('https://github.com/org/repo.git');
    gitUtils.getCurrentGitBranch.mockResolvedValue('main');
    gitUtils.pushGitChanges.mockRejectedValue(new Error('fatal: could not read Username for \'https://github.com\': terminal prompts disabled'));

    await expect(pushGitBranch(context, { collectionPath, processUid: 'p1' })).rejects.toThrow('Authentication failed');
  });

  it('pulls with fast-forward only by default and rejects unknown strategies', async () => {
    getCollectionGitRepoUrl.mockResolvedValue('https://github.com/org/repo.git');
    gitUtils.getCurrentGitBranch.mockResolvedValue('main');

    await pullGitBranch(context, { collectionPath, processUid: 'p2' });
    expect(gitUtils.pullGitChanges).toHaveBeenCalledWith(context.mainWindow, expect.objectContaining({ strategy: '--ff-only' }));

    await expect(pullGitBranch(context, { collectionPath, processUid: 'p2', strategy: '--rebase' }))
      .rejects.toThrow('Pull strategy is not valid');
  });
});

describe('runExclusive', () => {
  it('runs operations on the same repository one after another, even after a failure', async () => {
    const events = [];
    const step = (name, fail) => async () => {
      events.push(`start ${name}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      events.push(`end ${name}`);
      if (fail) {
        throw new Error(name);
      }
    };

    const first = runExclusive('/repo', step('first', true));
    const second = runExclusive('/repo', step('second'));

    await expect(first).rejects.toThrow('first');
    await second;
    expect(events).toEqual(['start first', 'end first', 'start second', 'end second']);
  });
});
