const EnvironmentSecretsStore = require('../../src/store/env-secrets');
const { decryptStringSafe } = require('../../src/utils/encryption');

describe('EnvironmentSecretsStore', () => {
  let secretsStore;
  const collectionPath = '/tmp/test-collection';

  beforeEach(() => {
    secretsStore = new EnvironmentSecretsStore();
    secretsStore.store.clear();
  });

  it('encrypts secret values before persisting them', () => {
    const environment = {
      name: 'Local',
      variables: [
        { name: 'apiToken', value: 'new', enabled: true, secret: true },
        { name: 'host', value: 'http://localhost', enabled: true, secret: false }
      ]
    };

    secretsStore.storeEnvSecrets(collectionPath, environment);

    const stored = secretsStore.getEnvSecrets(collectionPath, environment);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('apiToken');
    expect(stored[0].value).not.toBe('new');
    expect(typeof stored[0].value).toBe('string');
    expect(stored[0].value.length).toBeGreaterThan(0);
  });

  it('round-trips the secret value through decryptStringSafe', () => {
    const environment = {
      name: 'Local',
      variables: [{ name: 'apiToken', value: 'new', enabled: true, secret: true }]
    };

    secretsStore.storeEnvSecrets(collectionPath, environment);

    const [stored] = secretsStore.getEnvSecrets(collectionPath, environment);
    const decrypted = decryptStringSafe(stored.value);
    expect(decrypted.success).toBe(true);
    expect(decrypted.value).toBe('new');
  });

  it('overwrites the prior encrypted value when the same secret is re-stored', () => {
    const environment = {
      name: 'Local',
      variables: [{ name: 'apiToken', value: 'first', enabled: true, secret: true }]
    };
    secretsStore.storeEnvSecrets(collectionPath, environment);
    const [first] = secretsStore.getEnvSecrets(collectionPath, environment);

    environment.variables[0].value = 'second';
    secretsStore.storeEnvSecrets(collectionPath, environment);
    const after = secretsStore.getEnvSecrets(collectionPath, environment);

    expect(after).toHaveLength(1);
    expect(after[0].value).not.toBe(first.value);
    expect(decryptStringSafe(after[0].value).value).toBe('second');
  });
});
