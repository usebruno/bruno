const Bru = require('../src/bru');

describe('Bru.setGlobalEnvVar', () => {
  const makeBru = () =>
    new Bru(
      /* runtime */ 'quickjs',
      /* envVariables */ {},
      /* runtimeVariables */ {},
      /* processEnvVars */ {},
      /* collectionPath */ '/',
      /* collectionVariables */ {},
      /* folderVariables */ {},
      /* requestVariables */ {},
      /* globalEnvironmentVariables */ {},
      /* oauth2CredentialVariables */ {},
      /* collectionName */ 'Test'
    );

  test('updates globalEnvironmentVariables and does not mark persistent when persist=false', () => {
    const bru = makeBru();
    bru.setGlobalEnvVar('non_persist', 'value', { persist: false });
    expect(bru.globalEnvironmentVariables.non_persist).toBe('value');
    expect(bru.persistentGlobalEnvVariables.non_persist).toBeUndefined();
  });

  test('updates globalEnvironmentVariables and tracks persistent when persist=true (string only)', () => {
    const bru = makeBru();
    bru.setGlobalEnvVar('persist_me', 'value', { persist: true });
    expect(bru.globalEnvironmentVariables.persist_me).toBe('value');
    expect(bru.persistentGlobalEnvVariables.persist_me).toBe('value');
  });

  test('updates globalEnvironmentVariables when options are omitted (defaults to non-persistent)', () => {
    const bru = makeBru();
    bru.setGlobalEnvVar('no_options', 'value');
    expect(bru.globalEnvironmentVariables.no_options).toBe('value');
    expect(bru.persistentGlobalEnvVariables.no_options).toBeUndefined();
  });

  test('throws when persist=true but value is not a string', () => {
    const bru = makeBru();
    expect(() => bru.setGlobalEnvVar('persist_me', 123, { persist: true })).toThrow(
      /Persistent global environment variables must be strings/
    );
  });

  test('changing existing key to non-persistent removes prior persisted entry', () => {
    const bru = makeBru();
    bru.setGlobalEnvVar('same_key', 'old', { persist: true });
    expect(bru.persistentGlobalEnvVariables.same_key).toBe('old');

    bru.setGlobalEnvVar('same_key', 'new');
    expect(bru.globalEnvironmentVariables.same_key).toBe('new');
    expect(bru.persistentGlobalEnvVariables.same_key).toBeUndefined();
  });

  test('changing existing key to persistent updates persisted value', () => {
    const bru = makeBru();
    bru.setGlobalEnvVar('same_key', 'old');
    expect(bru.persistentGlobalEnvVariables.same_key).toBeUndefined();

    bru.setGlobalEnvVar('same_key', 'new', { persist: true });
    expect(bru.globalEnvironmentVariables.same_key).toBe('new');
    expect(bru.persistentGlobalEnvVariables.same_key).toBe('new');
  });

  test('validates key name - invalid characters are rejected', () => {
    const bru = makeBru();
    expect(() => bru.setGlobalEnvVar('invalid key', 'v')).toThrow(/contains invalid characters/);
  });

  test('allows non-string values when persist is false or omitted', () => {
    const bru = makeBru();
    bru.setGlobalEnvVar('number_val', 123);
    expect(bru.globalEnvironmentVariables.number_val).toBe(123);
    expect(bru.persistentGlobalEnvVariables.number_val).toBeUndefined();

    bru.setGlobalEnvVar('object_val', { foo: 'bar' }, { persist: false });
    expect(bru.globalEnvironmentVariables.object_val).toEqual({ foo: 'bar' });
    expect(bru.persistentGlobalEnvVariables.object_val).toBeUndefined();
  });
});
