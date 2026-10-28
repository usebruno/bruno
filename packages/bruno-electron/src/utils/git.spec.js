jest.mock('simple-git', () => jest.fn(() => ({
  outputHandler: jest.fn(),
  clone: jest.fn((_url, _path, _options, callback) => callback(null, 'cloned'))
})));

const simpleGit = require('simple-git');
const { parseRemoteBranches, cloneGitRepository } = require('./git');

describe('parseRemoteBranches', () => {
  it('reads the branch names and the default branch out of ls-remote output', () => {
    const output = [
      'ref: refs/heads/main\tHEAD',
      '9c1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f\tHEAD',
      '9c1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f\trefs/heads/main',
      '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b\trefs/heads/feature/branch-selector'
    ].join('\n');

    expect(parseRemoteBranches(output)).toEqual({
      branches: ['main', 'feature/branch-selector'],
      defaultBranch: 'main'
    });
  });

  it('reads output written with CRLF line endings', () => {
    const output = ['ref: refs/heads/main\tHEAD', '9c1f2a3\trefs/heads/main', '1a2b3c4\trefs/heads/develop'].join('\r\n');

    expect(parseRemoteBranches(output)).toEqual({
      branches: ['main', 'develop'],
      defaultBranch: 'main'
    });
  });

  it('reports no default branch when the remote sends no symref line', () => {
    const output = ['9c1f2a3\trefs/heads/main', '1a2b3c4\trefs/heads/develop'].join('\n');

    expect(parseRemoteBranches(output)).toEqual({
      branches: ['main', 'develop'],
      defaultBranch: null
    });
  });

  it('ignores refs that are not branches', () => {
    const output = ['9c1f2a3\trefs/heads/main', '1a2b3c4\trefs/tags/v1.0.0', '2b3c4d5\trefs/pull/12/head'].join('\n');

    expect(parseRemoteBranches(output).branches).toEqual(['main']);
  });

  it('returns an empty listing for empty output', () => {
    expect(parseRemoteBranches('')).toEqual({ branches: [], defaultBranch: null });
    expect(parseRemoteBranches(undefined)).toEqual({ branches: [], defaultBranch: null });
  });
});

describe('cloneGitRepository', () => {
  const originalPlatform = process.platform;
  const win = { webContents: { send: jest.fn() } };

  const setPlatform = (platform) => Object.defineProperty(process, 'platform', { value: platform });

  afterEach(() => {
    setPlatform(originalPlatform);
    simpleGit.mockClear();
  });

  it('enables core.longpaths on Windows so deeply nested files can be checked out', async () => {
    setPlatform('win32');

    await cloneGitRepository(win, { url: 'https://example.com/repo.git', path: 'C:\\collections\\repo', processUid: 'p1' });

    expect(simpleGit).toHaveBeenCalledWith({ baseDir: 'C:\\collections\\repo', config: ['core.longpaths=true'] });
  });

  it('passes no extra git config on other platforms', async () => {
    setPlatform('darwin');

    await cloneGitRepository(win, { url: 'https://example.com/repo.git', path: '/collections/repo', processUid: 'p2' });

    expect(simpleGit).toHaveBeenCalledWith({ baseDir: '/collections/repo', config: [] });
  });
});
