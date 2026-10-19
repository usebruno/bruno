const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  initGit,
  stageChanges,
  unstageChanges,
  commitChanges,
  getStagedFilePaths,
  getChangedFilesInCollectionGit,
  getCurrentGitBranch,
  getAheadBehindCount,
  pushGitChanges,
  pullGitChanges
} = require('./git');

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

const writeFile = (root, relativePath, content) => {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
};

const createRepository = (root) => {
  fs.mkdirSync(root, { recursive: true });
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.name', 'Gruno Test');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'commit.gpgsign', 'false');
  return root;
};

const commitAll = (root, message) => {
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', message);
};

const fakeWindow = () => ({ webContents: { send: jest.fn() } });

describe('git utils against real repositories', () => {
  let workspace;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'gruno-git-'));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  describe('getChangedFilesInCollectionGit', () => {
    it('lists only the files of the collection, with paths relative to the repository root', async () => {
      const repo = createRepository(path.join(workspace, 'repo'));
      const collectionPath = path.join(repo, 'collections', 'api');
      writeFile(repo, 'collections/api/get-user.bru', 'meta { name: get user }');
      writeFile(repo, 'README.md', '# repo');
      commitAll(repo, 'initial');

      writeFile(repo, 'collections/api/get-user.bru', 'meta { name: get user v2 }');
      writeFile(repo, 'collections/api/new.bru', 'meta { name: new }');
      writeFile(repo, 'README.md', '# changed');
      writeFile(repo, 'collections/other/outside.bru', 'meta { name: outside }');

      const changes = await getChangedFilesInCollectionGit(repo, collectionPath);
      const unstagedPaths = changes.unstaged.map((file) => file.path).sort();

      expect(unstagedPaths).toEqual(['collections/api/get-user.bru', 'collections/api/new.bru']);
      expect(changes.staged).toEqual([]);
      expect(changes.totalFiles).toBe(2);
    });
  });

  describe('stage, unstage and commit', () => {
    it('moves a file between unstaged and staged and commits it', async () => {
      const repo = createRepository(path.join(workspace, 'repo'));
      writeFile(repo, 'request.bru', 'v1');
      commitAll(repo, 'initial');
      const filePath = writeFile(repo, 'request.bru', 'v2');

      await stageChanges(repo, [filePath]);
      let changes = await getChangedFilesInCollectionGit(repo, repo);
      expect(changes.staged.map((file) => file.path)).toEqual(['request.bru']);
      expect(await getStagedFilePaths(repo)).toEqual(['request.bru']);

      await unstageChanges(repo, [filePath]);
      changes = await getChangedFilesInCollectionGit(repo, repo);
      expect(changes.staged).toEqual([]);
      expect(changes.unstaged.map((file) => file.path)).toEqual(['request.bru']);

      await stageChanges(repo, [filePath]);
      const result = await commitChanges(repo, 'update request');

      expect(result.commit).toBeTruthy();
      expect(await getStagedFilePaths(repo)).toEqual([]);
      expect(git(repo, 'log', '-1', '--format=%s')).toBe('update request');
    });

    it('unstages a new file in a repository that has no commits yet', async () => {
      const repo = createRepository(path.join(workspace, 'repo'));
      const filePath = writeFile(repo, 'request.bru', 'v1');

      await stageChanges(repo, [filePath]);
      expect(await getStagedFilePaths(repo)).toEqual(['request.bru']);

      await unstageChanges(repo, [filePath]);

      expect(await getStagedFilePaths(repo)).toEqual([]);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('initGit', () => {
    it('creates a repository on the main branch', async () => {
      const collectionPath = path.join(workspace, 'collection');
      fs.mkdirSync(collectionPath);

      await initGit(collectionPath);

      expect(fs.existsSync(path.join(collectionPath, '.git'))).toBe(true);
      expect(git(collectionPath, 'symbolic-ref', '--short', 'HEAD')).toBe('main');
    });
  });

  describe('sync with a remote', () => {
    const setupRemote = () => {
      const remote = path.join(workspace, 'remote.git');
      git(workspace, 'init', '-q', '--bare', '-b', 'main', remote);

      const local = createRepository(path.join(workspace, 'local'));
      git(local, 'remote', 'add', 'origin', remote);
      writeFile(local, 'request.bru', 'v1');
      commitAll(local, 'initial');

      return { remote, local };
    };

    it('pushes a branch without upstream and sets it', async () => {
      const { remote, local } = setupRemote();

      await pushGitChanges(fakeWindow(), { gitRootPath: local, processUid: 'p1', remote: 'origin', remoteBranch: 'main' });

      expect(git(remote, 'log', '-1', '--format=%s', 'main')).toBe('initial');
      expect(git(local, 'rev-parse', '--abbrev-ref', 'main@{upstream}')).toBe('origin/main');
      expect(await getAheadBehindCount(local)).toMatchObject({ ahead: 0, behind: 0 });
    });

    it('reports commits ahead and behind, then pulls with fast-forward', async () => {
      const { remote, local } = setupRemote();
      git(local, 'push', '-q', '-u', 'origin', 'main');

      const teammate = path.join(workspace, 'teammate');
      git(workspace, 'clone', '-q', remote, teammate);
      git(teammate, 'config', 'user.name', 'Teammate');
      git(teammate, 'config', 'user.email', 'teammate@example.com');
      writeFile(teammate, 'other.bru', 'from teammate');
      commitAll(teammate, 'teammate change');
      git(teammate, 'push', '-q', 'origin', 'main');

      git(local, 'fetch', '-q', 'origin');
      expect(await getAheadBehindCount(local)).toMatchObject({ ahead: 0, behind: 1 });

      const win = fakeWindow();
      await pullGitChanges(win, { gitRootPath: local, processUid: 'p2', remote: 'origin', remoteBranch: 'main', strategy: '--ff-only' });

      expect(git(local, 'log', '-1', '--format=%s')).toBe('teammate change');
      expect(await getAheadBehindCount(local)).toMatchObject({ ahead: 0, behind: 0 });

      writeFile(local, 'request.bru', 'v2');
      commitAll(local, 'local change');
      expect(await getAheadBehindCount(local)).toMatchObject({ ahead: 1, behind: 0 });
      expect(await getCurrentGitBranch(local)).toBe('main');
    });

    it('fails a push to a remote that does not exist instead of waiting', async () => {
      const { local } = setupRemote();
      git(local, 'remote', 'set-url', 'origin', path.join(workspace, 'missing.git'));

      await expect(
        pushGitChanges(fakeWindow(), { gitRootPath: local, processUid: 'p3', remote: 'origin', remoteBranch: 'main' })
      ).rejects.toThrow();
    });
  });
});
