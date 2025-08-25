const Bru = require('../src/bru');

describe('Bru.setEnvVar', () => {
  const makeBru = () => new Bru(
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

  test('throws when persist=true but value is not a string', () => {
    const bru = makeBru();
    expect(() => bru.setEnvVar('persist_me', 123, { persist: true })).toThrow(
      /Persistent environment variables must be strings/
    );
  });

  test('validates key name - invalid characters are rejected', () => {
    const bru = makeBru();
    expect(() => bru.setEnvVar('invalid key', 'v')).toThrow(/contains invalid characters/);
  });
});