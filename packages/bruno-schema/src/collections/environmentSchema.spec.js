const { uuid } = require('../utils/testUtils');
const { environmentSchema } = require('./index');

const buildVariable = (overrides = {}) => ({
  uid: uuid(),
  name: 'env_var',
  value: 'value',
  type: 'text',
  enabled: true,
  secret: false,
  ...overrides
});

const buildEnvironment = (overrides = {}) => ({
  uid: uuid(),
  name: 'My Environment',
  variables: [],
  ...overrides
});

describe('Environment Schema Validation', () => {
  describe('variable datatype', () => {
    it.each(['string', 'number', 'boolean', 'object'])('validates a variable with datatype %s', async (datatype) => {
      const env = buildEnvironment({ variables: [buildVariable({ datatype })] });

      await expect(environmentSchema.validate(env)).resolves.toBeTruthy();
    });

    it('preserves datatype after validation', async () => {
      const env = buildEnvironment({ variables: [buildVariable({ value: '300', datatype: 'number' })] });

      const validated = await environmentSchema.validate(env);

      expect(validated.variables[0].datatype).toBe('number');
      expect(validated.variables[0].value).toBe('300');
    });
  });

  describe('external secrets', () => {
    it('preserves externalSecrets with provider-specific variable keys after validation', async () => {
      const externalSecrets = {
        type: 'my-vault',
        variables: [
          { name: 'by_value', value: 'secret/data/secret' },
          { name: 'by_path', path: 'secret/data/secret' },
          { name: 'by_secret_name', secretName: 'secret' },
          { name: 'by_vault_name', vaultName: 'secret' }
        ]
      };
      const env = buildEnvironment({ externalSecrets });

      const validated = await environmentSchema.validate(env);

      expect(validated.externalSecrets).toEqual(externalSecrets);
    });

    it('validates externalSecrets with no variables', async () => {
      const env = buildEnvironment({ externalSecrets: { type: 'my-vault', variables: [] } });

      await expect(environmentSchema.validate(env)).resolves.toBeTruthy();
    });

    it('rejects unknown keys on the externalSecrets object', async () => {
      const env = buildEnvironment({
        externalSecrets: { type: 'my-vault', variables: [], provider: 'hashicorp' }
      });

      await expect(environmentSchema.validate(env)).rejects.toThrow();
    });
  });
});
