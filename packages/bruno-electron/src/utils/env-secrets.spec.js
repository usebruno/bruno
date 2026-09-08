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
      getEnvSecrets,
      decryptSecretValue: (value) => `decrypted:${value}`
    });

    decrypt(environment, 'Local');

    expect(getEnvSecrets).toHaveBeenCalledWith('Local');
    expect(environment.variables.find((v) => v.name === 'token').value).toBe('decrypted:enc');
    expect(environment.variables.find((v) => v.name === 'baseUrl').value).toBe('https://x');
  });

  it('leaves an environment untouched when none of its variables are marked secret', () => {
    const environment = {
      name: 'Local',
      variables: [
        { name: 'token', value: 'typed by the user', secret: false, enabled: true },
        { name: 'baseUrl', value: 'https://x', secret: false, enabled: true }
      ]
    };
    const decrypt = createEnvSecretsDecryptor({
      getEnvSecrets: () => [{ name: 'token', value: 'an old secret' }],
      decryptSecretValue: (value) => `decrypted:${value}`
    });

    decrypt(environment, 'Local');

    expect(environment.variables.map((v) => v.value)).toEqual(['typed by the user', 'https://x']);
  });

  it('does nothing when the environment has no variables at all, rather than failing', () => {
    const decrypt = createEnvSecretsDecryptor({
      getEnvSecrets: () => [{ name: 'token', value: 'enc' }],
      decryptSecretValue: (value) => `decrypted:${value}`
    });

    expect(() => decrypt({ name: 'Local' }, 'Local')).not.toThrow();
    expect(() => decrypt({ name: 'Local', variables: null }, 'Local')).not.toThrow();
  });

  it('leaves a plain variable alone even when the store still holds an old secret under that name', () => {
    const environment = {
      name: 'Local',
      variables: [
        { name: 'token', value: '', secret: true, enabled: true },
        { name: 'apiKey', value: 'typed by the user', secret: false, enabled: true }
      ]
    };
    const decrypt = createEnvSecretsDecryptor({
      getEnvSecrets: () => [
        { name: 'token', value: 'enc' },
        { name: 'apiKey', value: 'an old secret' }
      ],
      decryptSecretValue: (value) => `decrypted:${value}`
    });

    decrypt(environment, 'Local');

    expect(environment.variables.find((v) => v.name === 'token').value).toBe('decrypted:enc');
    expect(environment.variables.find((v) => v.name === 'apiKey').value).toBe('typed by the user');
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
      getEnvSecrets: () => [{ name: 'token', value: 'enc' }],
      decryptSecretValue: (value) => `decrypted:${value}`
    });

    decrypt(environment, 'Local');

    expect(environment.variables.map((v) => v.value)).toEqual(['decrypted:enc', 'second']);
  });

  it('skips a stored secret with no matching variable or an empty value', () => {
    const environment = makeEnv();
    const decrypt = createEnvSecretsDecryptor({
      getEnvSecrets: () => [{ name: 'ghost', value: 'enc' }, { name: 'token', value: '' }],
      decryptSecretValue: (value) => `decrypted:${value}`
    });

    decrypt(environment, 'Local');

    expect(environment.variables.find((v) => v.name === 'token').value).toBe('');
    expect(environment.variables.some((v) => v.name === 'ghost')).toBe(false);
  });
});
