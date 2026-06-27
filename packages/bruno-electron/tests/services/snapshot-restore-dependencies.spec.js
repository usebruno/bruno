const fs = require('fs');
const os = require('os');
const path = require('path');
const snapshotManager = require('../../src/services/snapshot');

const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-snapshot-restore-'));

const emptySnapshot = {
  version: '0.0.1',
  activeWorkspacePath: null,
  extras: { devTools: { open: false, activeTab: 'terminal', tabs: {} } },
  workspaces: [],
  collections: []
};

const snapshotExtras = { devTools: { open: false, activeTab: 'terminal', tabs: {} } };

describe('SnapshotManager restore dependencies', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = createTempDir();
    snapshotManager.saveSnapshot(emptySnapshot);
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    snapshotManager.saveSnapshot(emptySnapshot);
  });

  it('reports waiting workspace and collection dependencies from snapshot state', async () => {
    const workspacePath = path.join(tempRoot, 'workspace');
    const collectionPath = path.join(workspacePath, 'collections', 'demo');
    fs.mkdirSync(path.join(workspacePath, 'collections', 'demo', 'environments'), { recursive: true });
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), 'name: Demo Workspace\n');
    fs.writeFileSync(path.join(collectionPath, 'bruno.json'), '{}');
    fs.writeFileSync(path.join(collectionPath, 'environments', 'local.bru'), 'vars {\n  host: localhost\n}\n');

    snapshotManager.saveSnapshot({
      version: '0.0.1',
      activeWorkspacePath: workspacePath,
      extras: snapshotExtras,
      workspaces: [{
        pathname: workspacePath,
        environment: '',
        lastActiveCollectionPathname: collectionPath,
        sorting: 'default',
        collections: [collectionPath]
      }],
      collections: [{
        pathname: collectionPath,
        workspacePathname: workspacePath,
        environment: {
          collection: path.join(collectionPath, 'environments', 'local.bru'),
          global: ''
        },
        environmentPath: path.join(collectionPath, 'environments', 'local.bru'),
        selectedEnvironment: 'local',
        isOpen: true,
        isMounted: true,
        activeTab: null,
        tabs: []
      }]
    });

    const dependencies = await snapshotManager.getBootWorkspaceRestoreDependencies([workspacePath]);
    const workspaceDependency = dependencies.find((dependency) => dependency.type === 'workspace');
    const collectionDependency = dependencies.find((dependency) => dependency.type === 'collection');

    expect(workspaceDependency).toMatchObject({
      type: 'workspace',
      status: 'waiting',
      pathname: workspacePath,
      preserveSnapshot: true
    });
    expect(collectionDependency).toMatchObject({
      type: 'collection',
      status: 'waiting',
      pathname: collectionPath,
      workspacePathname: workspacePath,
      preserveSnapshot: true
    });
  });

  it('reports missing workspace and collection dependencies while preserving snapshot', async () => {
    const workspacePath = path.join(tempRoot, 'missing-workspace');
    const collectionPath = path.join(workspacePath, 'collections', 'demo');

    snapshotManager.saveSnapshot({
      version: '0.0.1',
      activeWorkspacePath: workspacePath,
      extras: snapshotExtras,
      workspaces: [{
        pathname: workspacePath,
        environment: '',
        lastActiveCollectionPathname: collectionPath,
        sorting: 'default',
        collections: [collectionPath]
      }],
      collections: [{
        pathname: collectionPath,
        workspacePathname: workspacePath,
        environment: { collection: '', global: '' },
        environmentPath: '',
        selectedEnvironment: '',
        isOpen: true,
        isMounted: false,
        activeTab: null,
        tabs: []
      }]
    });

    const dependencies = await snapshotManager.getBootWorkspaceRestoreDependencies([workspacePath]);
    const workspaceDependency = dependencies.find((dependency) => dependency.type === 'workspace');
    const collectionDependency = dependencies.find((dependency) => dependency.type === 'collection');

    expect(workspaceDependency).toMatchObject({
      type: 'workspace',
      status: 'missing',
      preserveSnapshot: true
    });
    expect(collectionDependency).toMatchObject({
      type: 'collection',
      status: 'missing',
      preserveSnapshot: true
    });
  });

  it('reports waiting and missing collection environment restore states', async () => {
    const collectionPath = path.join(tempRoot, 'collection');
    const environmentPath = path.join(collectionPath, 'environments', 'local.bru');
    fs.mkdirSync(path.dirname(environmentPath), { recursive: true });
    fs.writeFileSync(path.join(collectionPath, 'bruno.json'), '{}');
    fs.writeFileSync(environmentPath, 'vars {\n  host: localhost\n}\n');

    snapshotManager.saveSnapshot({
      version: '0.0.1',
      activeWorkspacePath: null,
      extras: snapshotExtras,
      workspaces: [],
      collections: [{
        pathname: collectionPath,
        workspacePathname: '',
        environment: {
          collection: environmentPath,
          global: ''
        },
        environmentPath,
        selectedEnvironment: 'local',
        isOpen: true,
        isMounted: true,
        activeTab: null,
        tabs: []
      }]
    });

    const waitingState = await snapshotManager.getCollectionEnvironmentRestoreState(collectionPath);
    expect(waitingState).toMatchObject({
      type: 'environment',
      status: 'waiting',
      environmentPath,
      selectedEnvironment: 'local',
      preserveSnapshot: true
    });

    fs.rmSync(environmentPath);

    const missingState = await snapshotManager.getCollectionEnvironmentRestoreState(collectionPath);
    expect(missingState).toMatchObject({
      type: 'environment',
      status: 'missing',
      selectedEnvironment: 'local',
      preserveSnapshot: true
    });
  });
});
