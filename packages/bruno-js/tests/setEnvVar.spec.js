const Bru = require('../src/bru');

describe('Bru.setEnvVar', () => {
  const makeBru = () =>
    new Bru({
      runtime: 'quickjs',
      envVariables: {},
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });

  test('sets envVariables[key] to value', () => {
    const bru = makeBru();
    bru.setEnvVar('token', 'abc123');
    expect(bru.envVariables.token).toBe('abc123');
  });

  test('allows non-string values', () => {
    const bru = makeBru();
    bru.setEnvVar('count', 42);
    expect(bru.envVariables.count).toBe(42);

    bru.setEnvVar('active', true);
    expect(bru.envVariables.active).toBe(true);

    bru.setEnvVar('config', { port: 3000 });
    expect(bru.envVariables.config).toEqual({ port: 3000 });
  });

  test('overwrites existing value', () => {
    const bru = makeBru();
    bru.setEnvVar('key', 'old');
    bru.setEnvVar('key', 'new');
    expect(bru.envVariables.key).toBe('new');
  });

  test('throws when key is empty', () => {
    const bru = makeBru();
    expect(() => bru.setEnvVar('', 'v')).toThrow(/without specifying a name/);
  });

  test('validates key name - invalid characters are rejected', () => {
    const bru = makeBru();
    expect(() => bru.setEnvVar('invalid key', 'v')).toThrow(/contains invalid characters/);
  });

  test('deleteEnvVar removes the variable', () => {
    const bru = makeBru();
    bru.setEnvVar('token', 'abc');
    bru.deleteEnvVar('token');
    expect(bru.envVariables.token).toBeUndefined();
  });
});
