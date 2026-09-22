const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../env-secrets', () =>
  class EnvironmentSecretsStoreStub {
    getEnvSecrets() {
      return [];
    }

    storeEnvSecrets() {}
  }
);

const { GlobalEnvironmentsManager } = require('../workspace-environments');

describe('workspace environments - saveGlobalEnvironment', () => {
  let workspacePath;
  let manager;

  const findEnvironment = async (name) => {
    const { globalEnvironments } = await manager.getGlobalEnvironments(workspacePath);
    return globalEnvironments.find((env) => env.name === name);
  };

  beforeEach(async () => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-workspace-envs-'));
    manager = new GlobalEnvironmentsManager();

    await manager.createGlobalEnvironment(workspacePath, {
      name: 'Child',
      variables: [{ name: 'host', value: 'localhost', enabled: true }],
      color: '#ff0000',
      extends: 'Base'
    });
  });

  afterEach(() => {
    fs.rmSync(workspacePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('keeps the existing parent when the save omits extends', async () => {
    const { uid } = await findEnvironment('Child');

    await manager.saveGlobalEnvironment(workspacePath, {
      environmentUid: uid,
      variables: [{ name: 'host', value: '127.0.0.1', enabled: true }]
    });

    const saved = await findEnvironment('Child');
    expect(saved.extends).toBe('Base');
    expect(saved.variables[0].value).toBe('127.0.0.1');
  });

  it('replaces the parent when the save sets extends', async () => {
    const { uid } = await findEnvironment('Child');

    await manager.saveGlobalEnvironment(workspacePath, {
      environmentUid: uid,
      variables: [],
      extends: 'OtherBase'
    });

    const saved = await findEnvironment('Child');
    expect(saved.extends).toBe('OtherBase');
  });

  it('clears the parent when the save passes an empty extends', async () => {
    const { uid } = await findEnvironment('Child');

    await manager.saveGlobalEnvironment(workspacePath, {
      environmentUid: uid,
      variables: [],
      extends: null
    });

    const saved = await findEnvironment('Child');
    expect(saved.extends).toBeUndefined();
  });

  it('keeps the existing color when the save omits color', async () => {
    const { uid } = await findEnvironment('Child');

    await manager.saveGlobalEnvironment(workspacePath, {
      environmentUid: uid,
      variables: []
    });

    const saved = await findEnvironment('Child');
    expect(saved.color).toBe('#ff0000');
  });

  it('clears the color when the save passes an empty color', async () => {
    const { uid } = await findEnvironment('Child');

    await manager.saveGlobalEnvironment(workspacePath, {
      environmentUid: uid,
      variables: [],
      color: null
    });

    const saved = await findEnvironment('Child');
    expect(saved.color).toBeNull();
  });

  it('keeps external secrets when the save omits them', async () => {
    const environmentsDir = path.join(workspacePath, 'environments');
    fs.writeFileSync(
      path.join(environmentsDir, 'External.yml'),
      [
        'name: External',
        'externalSecrets:',
        '  type: vault',
        '  variables:',
        '    - name: token',
        '      path: secret/data/app',
        'variables:',
        '  - name: host',
        '    value: localhost'
      ].join('\n')
    );

    const { uid } = await findEnvironment('External');

    await manager.saveGlobalEnvironment(workspacePath, {
      environmentUid: uid,
      variables: [{ name: 'host', value: '127.0.0.1', enabled: true }]
    });

    const saved = await findEnvironment('External');
    expect(saved.externalSecrets).toEqual({
      type: 'vault',
      variables: [{ name: 'token', path: 'secret/data/app' }]
    });
    expect(saved.variables[0].value).toBe('127.0.0.1');
  });
});
