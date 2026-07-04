const path = require('path');
const fs = require('fs');
const os = require('os');

jest.mock('../../src/services/snapshot', () => ({
  getSnapshot: jest.fn(() => ({ activeWorkspacePath: null }))
}));

const snapshotManager = require('../../src/services/snapshot');
const {
  normalizeWorkspacePathname,
  prioritizeActiveWorkspacePath,
  isValidWorkspacePathOnDisk,
  resolveLastOpenedWorkspacePaths
} = require('../../src/utils/workspace-startup');

const buildWorkspaceYml = (name) => [
  'opencollection: 1.0.0',
  'info:',
  `  name: ${name}`,
  '  type: workspace',
  'collections:',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

const createWorkspaceDir = (rootDir, name, { ymlContent = null } = {}) => {
  const workspacePath = path.join(rootDir, name);
  fs.mkdirSync(workspacePath, { recursive: true });

  if (ymlContent !== null) {
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), ymlContent);
  } else {
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml(name));
  }

  return workspacePath;
};

describe('normalizeWorkspacePathname', () => {
  test('returns empty string for empty or non-string input', () => {
    expect(normalizeWorkspacePathname('')).toBe('');
    expect(normalizeWorkspacePathname(null)).toBe('');
    expect(normalizeWorkspacePathname(undefined)).toBe('');
    expect(normalizeWorkspacePathname(123)).toBe('');
  });

  test('strips trailing slashes and normalizes paths', () => {
    const input = '/tmp/workspace-one/';
    const normalized = normalizeWorkspacePathname(input);

    expect(normalized).toBe(path.normalize('/tmp/workspace-one'));
    expect(normalizeWorkspacePathname(`${input}/`)).toBe(normalized);
  });

  test('strips trailing backslashes on Windows-style paths', () => {
    const input = 'C:\\workspaces\\demo\\\\';
    const normalized = normalizeWorkspacePathname(input);

    expect(normalized).toBe(path.normalize('C:\\workspaces\\demo'));
  });
});

describe('prioritizeActiveWorkspacePath', () => {
  const ws1 = '/tmp/ws1';
  const ws2 = '/tmp/ws2';
  const ws3 = '/tmp/ws3';
  const ws4 = '/tmp/ws4';
  const ws5 = '/tmp/ws5';

  test('returns input unchanged when active path is missing or list is too short', () => {
    expect(prioritizeActiveWorkspacePath([ws1], ws2)).toEqual([ws1]);
    expect(prioritizeActiveWorkspacePath([], ws2)).toEqual([]);
    expect(prioritizeActiveWorkspacePath([ws1, ws2], null)).toEqual([ws1, ws2]);
  });

  test('returns input unchanged when active path is already first', () => {
    const paths = [ws4, ws3, ws2, ws1];
    expect(prioritizeActiveWorkspacePath(paths, ws4)).toEqual(paths);
  });

  test('moves active path from later position to front', () => {
    const paths = [ws5, ws4, ws3, ws2, ws1];
    expect(prioritizeActiveWorkspacePath(paths, ws4)).toEqual([ws4, ws5, ws3, ws2, ws1]);
    expect(prioritizeActiveWorkspacePath(paths, ws2)).toEqual([ws2, ws5, ws4, ws3, ws1]);
  });

  test('returns input unchanged when active path is not in list', () => {
    const paths = [ws5, ws4, ws3];
    expect(prioritizeActiveWorkspacePath(paths, '/tmp/missing')).toEqual(paths);
  });

  test('matches paths with trailing slash variants', () => {
    const paths = [ws5, ws4, ws3];
    expect(prioritizeActiveWorkspacePath(paths, `${ws4}/`)).toEqual([ws4, ws5, ws3]);
  });
});

describe('isValidWorkspacePathOnDisk', () => {
  let rootDir;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-ws-startup-'));
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  test('returns false when workspace.yml is missing', () => {
    const workspacePath = path.join(rootDir, 'missing-yml');
    fs.mkdirSync(workspacePath, { recursive: true });

    expect(isValidWorkspacePathOnDisk(workspacePath)).toBe(false);
    expect(isValidWorkspacePathOnDisk(workspacePath, { validateConfig: true })).toBe(false);
  });

  test('returns true when workspace.yml exists and config validation is disabled', () => {
    const workspacePath = createWorkspaceDir(rootDir, 'exists-only');

    expect(isValidWorkspacePathOnDisk(workspacePath, { validateConfig: false })).toBe(true);
  });

  test('returns true for valid workspace.yml when config validation is enabled', () => {
    const workspacePath = createWorkspaceDir(rootDir, 'valid-config');

    expect(isValidWorkspacePathOnDisk(workspacePath, { validateConfig: true })).toBe(true);
  });

  test('returns false for malformed workspace.yml when config validation is enabled', () => {
    const workspacePath = createWorkspaceDir(rootDir, 'malformed-config', {
      ymlContent: 'invalid: yaml: [[['
    });

    expect(isValidWorkspacePathOnDisk(workspacePath, { validateConfig: true })).toBe(false);
  });
});

describe('resolveLastOpenedWorkspacePaths', () => {
  let rootDir;
  let ws1;
  let ws2;
  let ws3;
  let ws4;
  let ws5;
  let defaultWorkspacePath;
  let lastOpenedWorkspaces;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-ws-startup-resolve-'));
    ws1 = createWorkspaceDir(rootDir, 'workspace-one');
    ws2 = createWorkspaceDir(rootDir, 'workspace-two');
    ws3 = createWorkspaceDir(rootDir, 'workspace-three');
    ws4 = createWorkspaceDir(rootDir, 'workspace-four');
    ws5 = createWorkspaceDir(rootDir, 'workspace-five');
    defaultWorkspacePath = createWorkspaceDir(rootDir, 'default-workspace');

    lastOpenedWorkspaces = {
      getAll: jest.fn(() => [ws5, ws4, ws3, ws2, ws1]),
      remove: jest.fn()
    };

    snapshotManager.getSnapshot.mockReturnValue({ activeWorkspacePath: null });
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  test('prioritizes 4th-position active workspace', () => {
    snapshotManager.getSnapshot.mockReturnValue({ activeWorkspacePath: ws4 });

    const result = resolveLastOpenedWorkspacePaths(lastOpenedWorkspaces, {
      validateConfig: true
    });

    expect(lastOpenedWorkspaces.getAll).toHaveBeenCalledTimes(1);
    expect(result.validWorkspaces).toEqual([ws4, ws5, ws3, ws2, ws1]);
    expect(result.invalidPaths).toEqual([]);
    expect(lastOpenedWorkspaces.remove).not.toHaveBeenCalled();
  });

  test('prioritizes 5th-position active workspace when already MRU-first', () => {
    snapshotManager.getSnapshot.mockReturnValue({ activeWorkspacePath: ws5 });

    const result = resolveLastOpenedWorkspacePaths(lastOpenedWorkspaces, {
      validateConfig: true
    });

    expect(result.validWorkspaces).toEqual([ws5, ws4, ws3, ws2, ws1]);
  });

  test('includes active workspace from snapshot when it is valid but not in MRU list', () => {
    const externalWorkspace = createWorkspaceDir(rootDir, 'external-active');
    snapshotManager.getSnapshot.mockReturnValue({ activeWorkspacePath: externalWorkspace });

    const result = resolveLastOpenedWorkspacePaths(lastOpenedWorkspaces, {
      validateConfig: true
    });

    expect(result.validWorkspaces).toEqual([externalWorkspace, ws5, ws4, ws3, ws2, ws1]);
  });

  test('does not include malformed active workspace from snapshot', () => {
    const malformedWorkspace = createWorkspaceDir(rootDir, 'malformed-active', {
      ymlContent: 'invalid: yaml: [[['
    });
    snapshotManager.getSnapshot.mockReturnValue({ activeWorkspacePath: malformedWorkspace });

    const result = resolveLastOpenedWorkspacePaths(lastOpenedWorkspaces, {
      validateConfig: true
    });

    expect(result.validWorkspaces).toEqual([ws5, ws4, ws3, ws2, ws1]);
    expect(result.invalidPaths).toEqual([]);
  });

  test('skips default workspace path and removes invalid MRU entries', () => {
    const missingYmlPath = path.join(rootDir, 'missing-yml');
    fs.mkdirSync(missingYmlPath, { recursive: true });

    lastOpenedWorkspaces.getAll.mockReturnValue([ws3, defaultWorkspacePath, missingYmlPath, ws1]);
    snapshotManager.getSnapshot.mockReturnValue({ activeWorkspacePath: ws1 });

    const result = resolveLastOpenedWorkspacePaths(lastOpenedWorkspaces, {
      defaultWorkspacePath,
      validateConfig: true
    });

    expect(result.validWorkspaces).toEqual([ws1, ws3]);
    expect(result.invalidPaths).toEqual([missingYmlPath]);
    expect(lastOpenedWorkspaces.remove).toHaveBeenCalledWith(missingYmlPath);
  });
});
