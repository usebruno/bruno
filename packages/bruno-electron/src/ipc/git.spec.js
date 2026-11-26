jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));
jest.mock('../utils/git', () => ({
  cloneGitRepository: jest.fn(),
  getCollectionGitRepoUrl: jest.fn(),
  listBranchesForRemoteUrl: jest.fn()
}));
jest.mock('../utils/filesystem', () => ({
  createDirectory: jest.fn(),
  removeDirectory: jest.fn()
}));

const { cloneGitRepository, getCollectionGitRepoUrl, listBranchesForRemoteUrl } = require('../utils/git');
const { createDirectory, removeDirectory } = require('../utils/filesystem');
const { getCollectionGitRemoteUrl, handleCloneGitRepository, handleListRemoteBranches } = require('./git');

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

describe('handleCloneGitRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clones a url with spaces around it as the trimmed url', async () => {
    const mainWindow = {};

    await handleCloneGitRepository(mainWindow, { url: '  https://github.com/org/repo.git  ', path: '/tmp/repo', processUid: 'p1', branch: 'main' });

    expect(createDirectory).toHaveBeenCalledWith('/tmp/repo');
    expect(cloneGitRepository).toHaveBeenCalledWith(mainWindow, {
      url: 'https://github.com/org/repo.git',
      path: '/tmp/repo',
      processUid: 'p1',
      branch: 'main'
    });
  });

  it('removes the created folder when the clone fails', async () => {
    cloneGitRepository.mockRejectedValue(new Error('clone failed'));

    await expect(handleCloneGitRepository({}, { url: 'https://github.com/org/repo.git', path: '/tmp/repo' })).rejects.toThrow('clone failed');
    expect(removeDirectory).toHaveBeenCalledWith('/tmp/repo');
  });
});
