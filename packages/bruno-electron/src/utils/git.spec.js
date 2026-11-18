const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const { simpleGit } = require('simple-git');
const { parseRemoteBranches, listBranchesForRemoteUrl } = require('./git');

const PUBLIC_REPOSITORY_URL = 'https://github.com/usebruno/github-rest-api-collection';
const UNREACHABLE_REPOSITORY_URL = 'https://github.com/usebruno/this-repo-does-not-exist';

const GIT_ALLOW_ENVIRONMENT = [
  'GIT_TERMINAL_PROMPT',
  'GIT_SSH_COMMAND',
  'GIT_SSH',
  'SSH_AUTH_SOCK',
  'GIT_OPTIONAL_LOCKS'
];

const hasGitInstalled = () => {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const remoteIsReachable = (url) => {
  try {
    execSync(`git ls-remote --heads ${url}`, { stdio: 'ignore', timeout: 20000 });
    return true;
  } catch {
    return false;
  }
};

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

describe('simple-git v4 (unmocked)', () => {
  const gitInstalled = hasGitInstalled();
  const publicRepoReachable = gitInstalled && remoteIsReachable(PUBLIC_REPOSITORY_URL);

  beforeAll(() => {
    if (!gitInstalled) {
      console.warn('Skipping simple-git integration checks: git is not installed');
    }
  });

  it('exposes simpleGit as a callable factory', () => {
    expect(typeof simpleGit).toBe('function');

    const git = simpleGit({
      baseDir: os.tmpdir(),
      config: ['core.longpaths=true'],
      allowEnvironment: GIT_ALLOW_ENVIRONMENT
    });

    expect(git).toBeDefined();
    expect(typeof git.status).toBe('function');
    expect(typeof git.listRemote).toBe('function');
  });

  it('createSimpleGit options produce a working instance against the repo root', async () => {
    if (!gitInstalled) return;

    const repoRoot = path.resolve(__dirname, '../../../../');
    const git = simpleGit({
      baseDir: repoRoot,
      config: ['core.longpaths=true'],
      allowEnvironment: GIT_ALLOW_ENVIRONMENT
    });

    const status = await git.status();
    expect(status.current).toEqual(expect.any(String));
  });

  (publicRepoReachable ? it : it.skip)(
    'listBranchesForRemoteUrl lists branches for a public HTTPS repository',
    async () => {
      const result = await listBranchesForRemoteUrl({ url: PUBLIC_REPOSITORY_URL });

      expect(result.branches.length).toBeGreaterThan(0);
      expect(result.branches).toContain('main');
      expect(result.defaultBranch).toBe('main');
    }
  );

  (publicRepoReachable ? it : it.skip)(
    'listBranchesForRemoteUrl succeeds when GIT_CONFIG_COUNT is present in the environment',
    async () => {
      const previous = process.env.GIT_CONFIG_COUNT;
      process.env.GIT_CONFIG_COUNT = '1';

      try {
        const result = await listBranchesForRemoteUrl({ url: PUBLIC_REPOSITORY_URL });
        expect(result.branches).toContain('main');
      } finally {
        if (previous === undefined) {
          delete process.env.GIT_CONFIG_COUNT;
        } else {
          process.env.GIT_CONFIG_COUNT = previous;
        }
      }
    }
  );

  (gitInstalled ? it : it.skip)(
    'listBranchesForRemoteUrl rejects unreachable remotes without simple-git API errors',
    async () => {
      // listRemote uses a 10s block timeout; default Jest timeout is too short on Windows CI.
      let error;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await listBranchesForRemoteUrl({ url: UNREACHABLE_REPOSITORY_URL });
      } catch (err) {
        error = err;
      } finally {
        consoleSpy.mockRestore();
      }

      expect(error).toBeDefined();
      expect(String(error)).not.toMatch(/simpleGit is not a function/i);
      expect(String(error)).not.toMatch(/allowEnvironment/i);
    },
    15000
  );
});

describe('cloneGitRepository', () => {
  const mockSimpleGit = jest.fn(() => ({
    outputHandler: jest.fn(),
    clone: jest.fn((_url, _path, _options, callback) => callback(null, 'cloned'))
  }));

  const win = { webContents: { send: jest.fn() } };

  beforeEach(() => {
    mockSimpleGit.mockClear();
    jest.resetModules();
    jest.doMock('simple-git', () => ({ simpleGit: (...args) => mockSimpleGit(...args) }));
  });

  afterEach(() => {
    jest.dontMock('simple-git');
    jest.resetModules();
  });

  it('enables core.longpaths so deeply nested files can be checked out on Windows', async () => {
    const { cloneGitRepository } = require('./git');

    await cloneGitRepository(win, { url: 'https://example.com/repo.git', path: '/collections/repo', processUid: 'p1' });

    expect(mockSimpleGit).toHaveBeenCalledWith({
      baseDir: '/collections/repo',
      config: ['core.longpaths=true'],
      allowEnvironment: expect.any(Array)
    });
  });
});
