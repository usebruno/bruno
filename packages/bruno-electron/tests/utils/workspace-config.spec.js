const path = require('path');
const fs = require('fs');
const os = require('os');
const yaml = require('js-yaml');
const { reorderWorkspaceCollections, renameWorkspace } = require('../../src/utils/workspace-config');

const collection = (name, pathSegment) => ({ name, path: pathSegment });

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

describe('renameWorkspace', () => {
  let parentDir;
  let workspacePath;

  /** Creates a workspace directory with workspace.yml */
  const createWorkspace = (folderName, workspaceName) => {
    const wsPath = path.join(parentDir, folderName);
    fs.mkdirSync(wsPath, { recursive: true });
    const content = [
      'opencollection: 1.0.0',
      'info:',
      `  name: "${workspaceName}"`,
      '  type: workspace',
      'collections:',
      'specs:',
      'docs: \'\''
    ].join('\n');
    fs.writeFileSync(path.join(wsPath, 'workspace.yml'), content);
    return wsPath;
  };

  /** Gets the workspace name from workspace.yml */
  const getWorkspaceName = (wsPath) => {
    const raw = fs.readFileSync(path.join(wsPath, 'workspace.yml'), 'utf8');
    const config = yaml.load(raw);
    return config.info?.name;
  };

  beforeEach(() => {
    parentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-ws-parent-'));
    workspacePath = createWorkspace('Untitled Workspace', 'Untitled Workspace');
  });

  afterEach(() => {
    fs.rmSync(parentDir, { recursive: true, force: true });
  });

  test('renames workspace folder and updates config', async () => {
    const result = await renameWorkspace(workspacePath, 'My API Project');

    expect(result.newWorkspacePath).toBe(path.join(parentDir, 'My API Project'));
    expect(fs.existsSync(path.join(parentDir, 'Untitled Workspace'))).toBe(false);
    expect(fs.existsSync(path.join(parentDir, 'My API Project'))).toBe(true);
    expect(getWorkspaceName(result.newWorkspacePath)).toBe('My API Project');
  });

  test('only updates config when folder name stays the same', async () => {
    // Create workspace where folder name matches sanitized target but display name differs
    const sameFolderPath = createWorkspace('My-Project', 'Old Name');

    // Rename to name that sanitizes to same folder name
    const result = await renameWorkspace(sameFolderPath, 'My:Project');

    expect(result.newWorkspacePath).toBeNull();
    expect(fs.existsSync(sameFolderPath)).toBe(true);
    // Verify config was actually updated
    expect(getWorkspaceName(sameFolderPath)).toBe('My:Project');
  });

  test('sanitizes special characters in folder name', async () => {
    const result = await renameWorkspace(workspacePath, 'My:API/Project<Test>');

    expect(result.newWorkspacePath).toBe(path.join(parentDir, 'My-API-Project-Test-'));
    expect(fs.existsSync(result.newWorkspacePath)).toBe(true);
    expect(getWorkspaceName(result.newWorkspacePath)).toBe('My:API/Project<Test>');
  });

  test('throws error when target folder already exists', async () => {
    // Create another workspace with the target name
    createWorkspace('Existing Project', 'Existing Project');

    await expect(renameWorkspace(workspacePath, 'Existing Project'))
      .rejects.toThrow('A folder named "Existing Project" already exists at this location');

    // Original workspace should still exist
    expect(fs.existsSync(workspacePath)).toBe(true);
  });

  test('handles case-insensitive rename on same folder', async () => {
    const testDir = path.join(parentDir, 'CaSe_TeSt');
    fs.mkdirSync(testDir);
    const isCaseInsensitive = fs.existsSync(path.join(parentDir, 'case_test'));
    fs.rmSync(testDir, { recursive: true });

    // Create workspace with lowercase name
    const lowerPath = createWorkspace('myworkspace', 'myworkspace');

    // Rename to different case
    const result = await renameWorkspace(lowerPath, 'MyWorkspace');

    if (isCaseInsensitive) {
      // On case-insensitive filesystems (macOS, Windows), paths are same
      expect(result.newWorkspacePath).toBeNull();
      expect(getWorkspaceName(lowerPath)).toBe('MyWorkspace');
    } else {
      // On case-sensitive filesystems (Linux), folder is actually renamed
      expect(result.newWorkspacePath).toBe(path.join(parentDir, 'MyWorkspace'));
      expect(fs.existsSync(result.newWorkspacePath)).toBe(true);
      expect(getWorkspaceName(result.newWorkspacePath)).toBe('MyWorkspace');
    }
  });

  test('preserves workspace.yml content after rename', async () => {
    // Add collections, specs, and other fields to the workspace
    const configPath = path.join(workspacePath, 'workspace.yml');
    const content = [
      'opencollection: 1.0.0',
      'info:',
      '  name: "Untitled Workspace"',
      '  type: workspace',
      'collections:',
      '  - name: "API"',
      '    path: "collections/api"',
      '    remote: "https://github.com/example/api"',
      'specs:',
      '  - name: "OpenAPI"',
      '    path: "specs/openapi.yaml"',
      'docs: \'Some documentation\'',
      '',
      'activeEnvironmentUid: env_123'
    ].join('\n');
    fs.writeFileSync(configPath, content);

    const result = await renameWorkspace(workspacePath, 'My Project');

    const newConfigPath = path.join(result.newWorkspacePath, 'workspace.yml');
    const newContent = fs.readFileSync(newConfigPath, 'utf8');
    const config = yaml.load(newContent);

    // Verify all fields are preserved
    expect(config.opencollection).toBe('1.0.0');
    expect(config.info.name).toBe('My Project');
    expect(config.info.type).toBe('workspace');
    expect(config.collections).toHaveLength(1);
    expect(config.collections[0].name).toBe('API');
    expect(config.collections[0].path).toBe('collections/api');
    expect(config.collections[0].remote).toBe('https://github.com/example/api');
    expect(config.specs).toHaveLength(1);
    expect(config.specs[0]).toEqual({ name: 'OpenAPI', path: 'specs/openapi.yaml' });
    expect(config.docs).toBe('Some documentation');
    expect(config.activeEnvironmentUid).toBe('env_123');
  });
});
