jest.mock('nanoid', () => ({
  nanoid: () => 'aaaaaaaaaaaaaaaaaaaa1',
  customAlphabet: () => () => 'aaaaaaaaaaaaaaaaaaaa1'
}));

import { applyVaultSecrets, defaultVaultConfig, NEW_ENVIRONMENT } from './vault-secrets';
import { addGlobalEnvironment, saveGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';

jest.mock('providers/ReduxStore/slices/global-environments', () => ({
  addGlobalEnvironment: jest.fn((payload) => ({ type: 'addGlobalEnvironment', payload })),
  saveGlobalEnvironment: jest.fn((payload) => ({ type: 'saveGlobalEnvironment', payload }))
}));

const vaultKeys = [
  { key: 'api-key', name: 'vault_api-key' },
  { key: 'tenant', name: 'vault_tenant' }
];

describe('applyVaultSecrets', () => {
  let dispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatch = jest.fn(() => Promise.resolve());
  });

  it('should do nothing when no vault keys were found', async () => {
    const issues = await applyVaultSecrets({
      vaultKeys: [],
      config: defaultVaultConfig,
      collections: [],
      globalEnvironments: [],
      dispatch
    });

    expect(issues).toEqual([]);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should report every key and write nothing when the step is skipped', async () => {
    const issues = await applyVaultSecrets({
      vaultKeys,
      config: { ...defaultVaultConfig, enabled: false },
      collections: [],
      globalEnvironments: [],
      dispatch
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({ path: 'Vault Secrets', severity: 'warning' });
    expect(issues[0].message).toContain('vault_api-key');
  });

  it('should add an environment to every collection for the collection target', async () => {
    const collections = [{ name: 'One' }, { name: 'Two', environments: [{ name: 'Existing' }] }];

    const issues = await applyVaultSecrets({
      vaultKeys,
      config: { ...defaultVaultConfig, target: 'collection', environmentName: 'Vault' },
      collections,
      globalEnvironments: [],
      dispatch
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(collections[0].environments).toHaveLength(1);
    expect(collections[1].environments.map((e) => e.name)).toEqual(['Existing', 'Vault']);

    const variables = collections[0].environments[0].variables;
    expect(variables.map((v) => v.name)).toEqual(['vault_api-key', 'vault_tenant']);
    expect(variables.every((v) => v.secret === true && v.enabled === true && v.type === 'text')).toBe(true);
    expect(variables.every((v) => v.value === '')).toBe(true);

    // Collection environments are written without values, so every key is still outstanding.
    expect(issues).toHaveLength(2);
  });

  it('should create a global environment carrying the entered values', async () => {
    const issues = await applyVaultSecrets({
      vaultKeys,
      config: { ...defaultVaultConfig, environmentName: 'Postman Vault', values: { 'vault_api-key': 's3cret' } },
      collections: [{ name: 'One' }],
      globalEnvironments: [],
      dispatch
    });

    expect(addGlobalEnvironment).toHaveBeenCalledTimes(1);
    const { name, variables } = addGlobalEnvironment.mock.calls[0][0];
    expect(name).toBe('Postman Vault');
    expect(variables).toEqual([
      expect.objectContaining({ name: 'vault_api-key', value: 's3cret', secret: true, type: 'text', enabled: true }),
      expect.objectContaining({ name: 'vault_tenant', value: '', secret: true })
    ]);

    // Only the key left blank is still outstanding.
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('vault_tenant');
  });

  it('should add only the missing keys to an existing global environment', async () => {
    const existing = {
      uid: 'env-1',
      name: 'Postman Vault',
      variables: [{ uid: 'v1', name: 'vault_api-key', value: 'kept', type: 'text', enabled: true, secret: true }]
    };

    await applyVaultSecrets({
      vaultKeys,
      config: { ...defaultVaultConfig, environmentUid: 'env-1', values: { 'vault_api-key': 'ignored', 'vault_tenant': 'new' } },
      collections: [{ name: 'One' }],
      globalEnvironments: [existing],
      dispatch
    });

    expect(addGlobalEnvironment).not.toHaveBeenCalled();
    expect(saveGlobalEnvironment).toHaveBeenCalledTimes(1);

    const { environmentUid, variables } = saveGlobalEnvironment.mock.calls[0][0];
    expect(environmentUid).toBe('env-1');
    expect(variables).toHaveLength(2);
    expect(variables[0].value).toBe('kept');
    expect(variables[1]).toEqual(expect.objectContaining({ name: 'vault_tenant', value: 'new', secret: true }));
  });

  it('should not write when every key already exists in the chosen global environment', async () => {
    const existing = {
      uid: 'env-1',
      name: 'Postman Vault',
      variables: vaultKeys.map(({ name }) => ({ uid: name, name, value: 'kept', type: 'text', enabled: true, secret: true }))
    };

    const issues = await applyVaultSecrets({
      vaultKeys,
      config: { ...defaultVaultConfig, environmentUid: 'env-1' },
      collections: [{ name: 'One' }],
      globalEnvironments: [existing],
      dispatch
    });

    expect(saveGlobalEnvironment).not.toHaveBeenCalled();
    expect(issues).toEqual([]);
  });

  it('should treat the sentinel uid as a request for a new environment', async () => {
    await applyVaultSecrets({
      vaultKeys,
      config: { ...defaultVaultConfig, environmentUid: NEW_ENVIRONMENT },
      collections: [{ name: 'One' }],
      globalEnvironments: [{ uid: 'env-1', name: 'Other', variables: [] }],
      dispatch
    });

    expect(addGlobalEnvironment).toHaveBeenCalledTimes(1);
    expect(saveGlobalEnvironment).not.toHaveBeenCalled();
  });
});
