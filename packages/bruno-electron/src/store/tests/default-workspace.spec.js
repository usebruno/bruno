const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseEnvironment } = require('@usebruno/filestore');

let mockGlobalEnvironments;
let mockUserDataPath;

jest.mock('electron', () => ({
  app: { getPath: () => mockUserDataPath }
}));

jest.mock('electron-store', () =>
  jest.fn().mockImplementation(() => ({
    get: (key, defaultValue) => defaultValue,
    set: jest.fn()
  }))
);

jest.mock('../global-environments', () => ({
  globalEnvironmentsStore: {
    getGlobalEnvironments: () => mockGlobalEnvironments,
    getActiveGlobalEnvironmentUid: () => null,
    setActiveGlobalEnvironmentUidForWorkspace: jest.fn()
  }
}));

const readMigratedEnvironment = (workspacePath, name) => {
  const content = fs.readFileSync(path.join(workspacePath, 'environments', `${name}.yml`), 'utf8');
  return parseEnvironment(content, { format: 'yml' });
};

describe('default workspace migration of global environments', () => {
  let workspacePath;
  let manager;

  beforeEach(() => {
    mockUserDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-userdata-'));
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-workspace-'));
    fs.mkdirSync(path.join(workspacePath, 'environments'));

    const { DefaultWorkspaceManager } = require('../default-workspace');
    manager = new DefaultWorkspaceManager();
  });

  afterEach(() => {
    fs.rmSync(mockUserDataPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    fs.rmSync(workspacePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('keeps the extends reference when the parent environment is also migrated', async () => {
    mockGlobalEnvironments = [
      { uid: 'dev-uid', name: 'Dev', variables: [], extends: 'Base' },
      { uid: 'base-uid', name: 'Base', variables: [] }
    ];

    await manager.migrateFromPreferences(workspacePath, { collections: [] });

    expect(readMigratedEnvironment(workspacePath, 'Dev').extends).toBe('Base');
  });

  it('leaves the recovered environment in place and still extends it when a legacy parent shares its name', async () => {
    fs.writeFileSync(
      path.join(workspacePath, 'environments', 'Base.yml'),
      'name: Base\ntype: environment\nvariables:\n  - name: host\n    value: recovered\n',
      'utf8'
    );
    mockGlobalEnvironments = [
      { uid: 'dev-uid', name: 'Dev', variables: [], extends: 'Base' },
      { uid: 'base-uid', name: 'Base', variables: [{ name: 'host', value: 'legacy', enabled: true }] }
    ];

    await manager.migrateFromPreferences(workspacePath, { collections: [] });

    expect(readMigratedEnvironment(workspacePath, 'Base').variables).toEqual([
      expect.objectContaining({ name: 'host', value: 'recovered' })
    ]);
    expect(readMigratedEnvironment(workspacePath, 'Dev').extends).toBe('Base');
  });

  it('keeps the extends reference when only the recovered environment exists', async () => {
    fs.writeFileSync(
      path.join(workspacePath, 'environments', 'Base.yml'),
      'name: Base\ntype: environment\n',
      'utf8'
    );
    mockGlobalEnvironments = [{ uid: 'dev-uid', name: 'Dev', variables: [], extends: 'Base' }];

    await manager.migrateFromPreferences(workspacePath, { collections: [] });

    expect(readMigratedEnvironment(workspacePath, 'Dev').extends).toBe('Base');
  });

  it('drops the extends reference when the parent is absent from the legacy environments', async () => {
    mockGlobalEnvironments = [{ uid: 'dev-uid', name: 'Dev', variables: [], extends: 'Base' }];

    await manager.migrateFromPreferences(workspacePath, { collections: [] });

    expect(readMigratedEnvironment(workspacePath, 'Dev').extends).toBeUndefined();
  });
});
