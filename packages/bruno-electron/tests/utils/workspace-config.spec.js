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

describe('workspace specs normalization', () => {
  const {
    readWorkspaceConfig,
    addApiSpecToWorkspace,
    removeApiSpecFromWorkspace
  } = require('../../src/utils/workspace-config');
  let workspacePath;

  // Writes workspace.yml with a verbatim `specs:` block so we control its YAML shape.
  const writeWorkspaceYml = (specsYaml) => {
    const content = [
      'opencollection: 1.0.0',
      'info:',
      '  name: Test',
      '  type: workspace',
      'collections: []',
      specsYaml,
      'docs: \'\''
    ].join('\n');
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), content);
  };

  beforeEach(() => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-ws-'));
  });

  afterEach(() => {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  // --- Regression guard: the `|| []` -> `Array.isArray(...) ? ... : []` swap must
  //     preserve behavior for every VALID shape, and only change non-array inputs. ---
  describe('readWorkspaceConfig coerces specs to an array', () => {
    const cases = [
      {
        name: 'valid populated list is preserved unchanged',
        yaml: ['specs:', '  - name: foo', '    path: foo.yaml', '  - name: bar', '    path: bar.yaml'].join('\n'),
        expected: [
          { name: 'foo', path: 'foo.yaml' },
          { name: 'bar', path: 'bar.yaml' }
        ]
      },
      { name: 'empty list stays empty', yaml: 'specs: []', expected: [] },
      { name: 'missing specs key -> []', yaml: '# no specs key', expected: [] },
      { name: 'null specs -> []', yaml: 'specs: null', expected: [] },
      { name: 'map (object) specs -> []', yaml: ['specs:', '  brokenEntry: not a list'].join('\n'), expected: [] },
      { name: 'string specs -> []', yaml: 'specs: "oops a string"', expected: [] },
      { name: 'number specs -> []', yaml: 'specs: 42', expected: [] },
      { name: 'boolean specs -> []', yaml: 'specs: true', expected: [] },
      {
        // An array of junk is still an array: coercion preserves it (no crash on .map);
        // invalid entries are dropped later by sanitizeSpecs on write, not here.
        name: 'array with non-object elements is preserved as-is',
        yaml: 'specs: [1, "two", null]',
        expected: [1, 'two', null]
      }
    ];

    test.each(cases)('$name', ({ yaml, expected }) => {
      writeWorkspaceYml(yaml);
      const config = readWorkspaceConfig(workspacePath);
      // Both the legacy `specs` field and the renderer-facing `apiSpecs` must be arrays.
      expect(Array.isArray(config.specs)).toBe(true);
      expect(Array.isArray(config.apiSpecs)).toBe(true);
      expect(config.specs).toEqual(expected);
      expect(config.apiSpecs).toEqual(expected);
      // apiSpecs mirrors specs by value but is a distinct array, so an in-place
      // mutation of one field can't silently change the other.
      expect(config.apiSpecs).not.toBe(config.specs);
    });
  });

  // --- Write paths must not throw on an already-malformed workspace.yml and must self-heal. ---
  describe('write paths survive a malformed (non-array) specs', () => {
    const malformedYaml = ['specs:', '  brokenEntry: not a list'].join('\n');
    const specsInYml = () => {
      const raw = fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8');
      return yaml.load(raw).specs;
    };

    test('addApiSpecToWorkspace does not throw and writes a valid list', async () => {
      writeWorkspaceYml(malformedYaml);
      const specPath = path.join(workspacePath, 'api.yaml');
      await expect(
        addApiSpecToWorkspace(workspacePath, { name: 'api', path: specPath })
      ).resolves.toBeDefined();

      const stored = specsInYml();
      expect(Array.isArray(stored)).toBe(true);
      expect(stored).toEqual([{ name: 'api', path: 'api.yaml' }]);
    });

    test('removeApiSpecFromWorkspace does not throw on malformed specs', async () => {
      writeWorkspaceYml(malformedYaml);
      const result = await removeApiSpecFromWorkspace(workspacePath, path.join(workspacePath, 'whatever.yaml'));
      expect(result.removedApiSpec).toBeNull();
      // Round-trip through readWorkspaceConfig (which coerces) must yield a safe array.
      expect(Array.isArray(readWorkspaceConfig(workspacePath).specs)).toBe(true);
    });
  });
});
