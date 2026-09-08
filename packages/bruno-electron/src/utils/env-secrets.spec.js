const { createEnvSecretsDecryptor } = require('./env-secrets');

const makeEnv = () => ({
  name: 'Local',
  variables: [
    { name: 'token', value: '', secret: true, enabled: true },
    { name: 'baseUrl', value: 'https://x', secret: false, enabled: true }
  ]
});

describe('createEnvSecretsDecryptor', () => {
  it('fetches secrets by environment name and decrypts each into its matching variable', () => {
    const environment = makeEnv();
    const getEnvSecrets = jest.fn(() => [{ name: 'token', value: 'enc' }]);
    const decrypt = createEnvSecretsDecryptor({
      envHasSecrets: () => true,
      getEnvSecrets,
      decryptSecretValue: (value) => `decrypted:${value}`
    });

    decrypt(environment, 'Local');

    expect(getEnvSecrets).toHaveBeenCalledWith('Local');
    expect(environment.variables.find((v) => v.name === 'token').value).toBe('decrypted:enc');
    expect(environment.variables.find((v) => v.name === 'baseUrl').value).toBe('https://x');
  });

  it('does nothing and never fetches secrets when the environment has none', () => {
    const environment = makeEnv();
    const getEnvSecrets = jest.fn();
    const decrypt = createEnvSecretsDecryptor({
      envHasSecrets: () => false,
      getEnvSecrets,
      decryptSecretValue: (value) => value
    });

    decrypt(environment, 'Local');

    expect(getEnvSecrets).not.toHaveBeenCalled();
    expect(environment.variables.find((v) => v.name === 'token').value).toBe('');
  });

  it('puts the secret into the first variable when two variables share the same name', () => {
    const environment = {
      name: 'Local',
      variables: [
        { name: 'token', value: 'first', secret: true, enabled: true },
        { name: 'token', value: 'second', secret: true, enabled: true }
      ]
    };
    const decrypt = createEnvSecretsDecryptor({
      envHasSecrets: () => true,
      getEnvSecrets: () => [{ name: 'token', value: 'enc' }],
      decryptSecretValue: (value) => `decrypted:${value}`
    });

    decrypt(environment, 'Local');

    expect(environment.variables.map((v) => v.value)).toEqual(['decrypted:enc', 'second']);
  });

  it('skips a stored secret with no matching variable or an empty value', () => {
    const environment = makeEnv();
    const decrypt = createEnvSecretsDecryptor({
      envHasSecrets: () => true,
      getEnvSecrets: () => [{ name: 'ghost', value: 'enc' }, { name: 'token', value: '' }],
      decryptSecretValue: (value) => `decrypted:${value}`
    });

    decrypt(environment, 'Local');

    expect(environment.variables.find((v) => v.name === 'token').value).toBe('');
    expect(environment.variables.some((v) => v.name === 'ghost')).toBe(false);
  });
});
