const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const { simpleGit } = require('simple-git');
const { listBranchesForRemoteUrl } = require('./git');

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
    }
  );
});
