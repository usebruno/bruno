const Bru = require('../src/bru');

describe('Bru.setEnvVar', () => {
  const makeBru = () =>
    new Bru(
      /* runtime */ 'quickjs',
      /* envVariables */ {},
      /* runtimeVariables */ {},
      /* processEnvVars */ {},
      /* collectionPath */ '/',
      /* historyLogger */ undefined,
      /* setVisualizations */ undefined,
      /* secretVariables */ {},
      /* collectionVariables */ {},
      /* folderVariables */ {},
      /* requestVariables */ {},
      /* globalEnvironmentVariables */ {},
      /* oauth2CredentialVariables */ {},
      /* iterationDetails */ {},
      /* collectionName */ 'Test'
    );

  test('updates envVariables and does not mark persistent when persist=false', () => {
    const bru = makeBru();
    bru.setEnvVar('non_persist', 'value', { persist: false });
    expect(bru.envVariables.non_persist).toBe('value');
    expect(bru.persistentEnvVariables.non_persist).toBeUndefined();
  });

  test('updates envVariables and tracks persistent when persist=true (string only)', () => {
    const bru = makeBru();
    bru.setEnvVar('persist_me', 'value', { persist: true });
    expect(bru.envVariables.persist_me).toBe('value');
    expect(bru.persistentEnvVariables.persist_me).toBe('value');
  });

  test('updates envVariables when options are omitted (defaults to non-persistent)', () => {
    const bru = makeBru();
    bru.setEnvVar('no_options', 'value');
    expect(bru.envVariables.no_options).toBe('value');
    expect(bru.persistentEnvVariables.no_options).toBeUndefined();
  });

  test('throws when persist=true but value is not a string', () => {
    const bru = makeBru();
    expect(() => bru.setEnvVar('persist_me', 123, { persist: true })).toThrow(
      /Persistent environment variables must be strings/
    );
  });

  test('changing existing key to non-persistent removes prior persisted entry', () => {
    const bru = makeBru();
    bru.setEnvVar('same_key', 'old', { persist: true });
    expect(bru.persistentEnvVariables.same_key).toBe('old');

    bru.setEnvVar('same_key', 'new');
    expect(bru.envVariables.same_key).toBe('new');
    expect(bru.persistentEnvVariables.same_key).toBeUndefined();
  });

  test('changing existing key to persistent updates persisted value', () => {
    const bru = makeBru();
    bru.setEnvVar('same_key', 'old');
    expect(bru.persistentEnvVariables.same_key).toBeUndefined();

    bru.setEnvVar('same_key', 'new', { persist: true });
    expect(bru.envVariables.same_key).toBe('new');
    expect(bru.persistentEnvVariables.same_key).toBe('new');
  });

  test('validates key name - invalid characters are rejected', () => {
    const bru = makeBru();
    expect(() => bru.setEnvVar('invalid key', 'v')).toThrow(/contains invalid characters/);
  });
});
