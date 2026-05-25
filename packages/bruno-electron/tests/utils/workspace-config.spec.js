const path = require('path');
const fs = require('fs');
const os = require('os');
const yaml = require('js-yaml');
const {
  reorderWorkspaceCollections,
  setCollectionGitRemote,
  clearCollectionGitRemote,
  getWorkspaceCollections
} = require('../../src/utils/workspace-config');

const collection = (name, pathSegment, extra = {}) => ({ name, path: pathSegment, ...extra });

describe('reorderWorkspaceCollections', () => {
  let workspacePath;

  /** Writes workspace.yml with the given collections (relative paths). */
  const writeWorkspaceYml = (collections) => {
    const content = [
      'opencollection: 1.0.0',
      'info:',
      '  name: Test',
      '  type: workspace',
      'collections:',
      ...collections.flatMap((c) => [`  - name: ${c.name}`, `    path: ${c.path}`]),
      'specs: []',
      'docs: \'\''
    ].join('\n');
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), content);
  };

  /** Returns collection paths (relative) in order as stored in workspace.yml. */
  const getCollectionPathsFromYml = () => {
    const raw = fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8');
    const config = yaml.load(raw);
    return (config.collections || []).map((c) => c.path);
  };

  /** Resolves a relative collection path segment to an absolute path under the current workspace. */
  const absPath = (relativePath) => path.resolve(workspacePath, relativePath);

  beforeEach(() => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-ws-'));
  });

  afterEach(() => {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  test('reorders collections to match given path list', async () => {
    writeWorkspaceYml([
      collection('API', 'collections/api'),
      collection('Backend', 'collections/backend'),
      collection('Frontend', 'collections/frontend')
    ]);

    await reorderWorkspaceCollections(workspacePath, [
      absPath('collections/frontend'),
      absPath('collections/api'),
      absPath('collections/backend')
    ]);

    expect(getCollectionPathsFromYml()).toEqual(['collections/frontend', 'collections/api', 'collections/backend']);
  });

  test('deduplicates when reorder list contains duplicate paths', async () => {
    writeWorkspaceYml([
      collection('API', 'collections/api'),
      collection('Backend', 'collections/backend')
    ]);

    await reorderWorkspaceCollections(workspacePath, [
      absPath('collections/api'),
      absPath('collections/backend'),
      absPath('collections/api'),
      absPath('collections/api')
    ]);

    expect(getCollectionPathsFromYml()).toEqual(['collections/api', 'collections/backend']);
  });
});

describe('Git remote on workspace collections', () => {
  let workspacePath;

  const writeYml = (collections) => {
    const lines = [
      'opencollection: 1.0.0',
      'info:',
      '  name: Test',
      '  type: workspace',
      'collections:'
    ];
    for (const c of collections) {
      lines.push(`  - name: "${c.name}"`);
      lines.push(`    path: "${c.path}"`);
      if (c.remote) lines.push(`    remote: "${c.remote}"`);
    }
    lines.push('specs: []');
    lines.push('docs: \'\'');
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), lines.join('\n'));
  };

  const readCollectionsFromYml = () => {
    const raw = fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8');
    return (yaml.load(raw).collections || []);
  };

  const absPath = (relativePath) => path.resolve(workspacePath, relativePath);

  const ensureCollectionDir = (relativePath) => {
    const dir = path.join(workspacePath, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'bruno.json'), JSON.stringify({ name: 'x', version: '1', type: 'collection' }));
  };

  beforeEach(() => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-ws-git-'));
  });

  afterEach(() => {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  test('setCollectionGitRemote sets remote on the matching entry only', async () => {
    writeYml([
      collection('API', 'collections/api'),
      collection('Backend', 'collections/backend')
    ]);

    await setCollectionGitRemote(workspacePath, absPath('collections/backend'), 'https://github.com/x/backend');

    const entries = readCollectionsFromYml();
    expect(entries[0]).toEqual({ name: 'API', path: 'collections/api' });
    expect(entries[1]).toEqual({ name: 'Backend', path: 'collections/backend', remote: 'https://github.com/x/backend' });
  });

  test('setCollectionGitRemote rejects empty URL', async () => {
    writeYml([collection('API', 'collections/api')]);
    await expect(
      setCollectionGitRemote(workspacePath, absPath('collections/api'), '   ')
    ).rejects.toThrow(/non-empty/i);
  });

  test('setCollectionGitRemote throws when collection is missing from workspace.yml', async () => {
    writeYml([collection('API', 'collections/api')]);
    await expect(
      setCollectionGitRemote(workspacePath, absPath('collections/missing'), 'https://github.com/x/y')
    ).rejects.toThrow(/not found/i);
  });

  test('clearCollectionGitRemote removes only the remote field', async () => {
    writeYml([
      collection('API', 'collections/api', { remote: 'https://github.com/x/api' }),
      collection('Backend', 'collections/backend', { remote: 'https://github.com/x/backend' })
    ]);

    await clearCollectionGitRemote(workspacePath, absPath('collections/api'));

    const entries = readCollectionsFromYml();
    expect(entries[0]).toEqual({ name: 'API', path: 'collections/api' });
    expect(entries[1]).toEqual({ name: 'Backend', path: 'collections/backend', remote: 'https://github.com/x/backend' });
  });

  test('getWorkspaceCollections keeps git-backed entries even when local folder is missing', () => {
    ensureCollectionDir('collections/api');
    writeYml([
      collection('API', 'collections/api'),
      collection('Missing', 'collections/missing', { remote: 'https://github.com/x/missing' })
    ]);

    const result = getWorkspaceCollections(workspacePath);

    expect(result).toHaveLength(2);
    const api = result.find((r) => r.name === 'API');
    const missing = result.find((r) => r.name === 'Missing');
    expect(api.notFoundLocally).toBeUndefined();
    expect(missing.notFoundLocally).toBe(true);
    expect(missing.remote).toBe('https://github.com/x/missing');
  });

  test('getWorkspaceCollections still drops missing entries that have no remote', () => {
    writeYml([collection('Missing', 'collections/missing')]);
    expect(getWorkspaceCollections(workspacePath)).toHaveLength(0);
  });

  test('setCollectionGitRemote adds the collection path to .gitignore', async () => {
    ensureCollectionDir('collections/api');
    writeYml([collection('API', 'collections/api')]);

    await setCollectionGitRemote(workspacePath, absPath('collections/api'), 'https://github.com/x/api');

    const gitignore = fs.readFileSync(path.join(workspacePath, '.gitignore'), 'utf8');
    expect(gitignore.split('\n')).toContain('collections/api/');
  });

  test('setCollectionGitRemote does not duplicate the .gitignore entry on repeated calls', async () => {
    ensureCollectionDir('collections/api');
    writeYml([collection('API', 'collections/api')]);

    await setCollectionGitRemote(workspacePath, absPath('collections/api'), 'https://github.com/x/api');
    await setCollectionGitRemote(workspacePath, absPath('collections/api'), 'https://github.com/x/api-renamed');

    const gitignore = fs.readFileSync(path.join(workspacePath, '.gitignore'), 'utf8');
    const matches = gitignore.split('\n').filter((line) => line.trim() === 'collections/api/');
    expect(matches).toHaveLength(1);
  });

  test('setCollectionGitRemote preserves existing .gitignore content', async () => {
    ensureCollectionDir('collections/api');
    writeYml([collection('API', 'collections/api')]);
    fs.writeFileSync(path.join(workspacePath, '.gitignore'), '# user notes\nnode_modules\n.env\n');

    await setCollectionGitRemote(workspacePath, absPath('collections/api'), 'https://github.com/x/api');

    const gitignore = fs.readFileSync(path.join(workspacePath, '.gitignore'), 'utf8');
    expect(gitignore).toContain('# user notes');
    expect(gitignore).toContain('node_modules');
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('collections/api/');
  });

  test('clearCollectionGitRemote removes the collection path from .gitignore', async () => {
    ensureCollectionDir('collections/api');
    writeYml([collection('API', 'collections/api', { remote: 'https://github.com/x/api' })]);
    fs.writeFileSync(path.join(workspacePath, '.gitignore'), [
      'node_modules',
      '# Bruno managed collection remotes',
      'collections/api/',
      '# End Bruno managed collection remotes',
      ''
    ].join('\n'));

    await clearCollectionGitRemote(workspacePath, absPath('collections/api'));

    const gitignore = fs.readFileSync(path.join(workspacePath, '.gitignore'), 'utf8');
    expect(gitignore.split('\n')).not.toContain('collections/api/');
    expect(gitignore).toContain('node_modules');
  });

  test('clearCollectionGitRemote preserves user-owned .gitignore entries', async () => {
    ensureCollectionDir('collections/api');
    writeYml([collection('API', 'collections/api')]);
    fs.writeFileSync(path.join(workspacePath, '.gitignore'), 'node_modules\ncollections/api/\n');

    await setCollectionGitRemote(workspacePath, absPath('collections/api'), 'https://github.com/x/api');
    await clearCollectionGitRemote(workspacePath, absPath('collections/api'));

    const gitignore = fs.readFileSync(path.join(workspacePath, '.gitignore'), 'utf8');
    expect(gitignore.split('\n')).toContain('collections/api/');
    expect(gitignore).toContain('node_modules');
  });

  test('setCollectionGitRemote skips .gitignore for collections outside the workspace', async () => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-outside-'));
    fs.writeFileSync(path.join(outsideDir, 'bruno.json'), JSON.stringify({ name: 'x', version: '1', type: 'collection' }));
    try {
      writeYml([collection('External', outsideDir)]);
      await setCollectionGitRemote(workspacePath, outsideDir, 'https://github.com/x/external');

      const gitignorePath = path.join(workspacePath, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, 'utf8');
        expect(gitignore).not.toContain(outsideDir);
      }
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });
});
