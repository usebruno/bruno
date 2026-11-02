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
  describe('variable dataType', () => {
    it.each(['string', 'number', 'boolean', 'object'])('validates a variable with dataType %s', async (dataType) => {
      const env = buildEnvironment({ variables: [buildVariable({ dataType })] });

      await expect(environmentSchema.validate(env)).resolves.toBeTruthy();
    });

    it('preserves dataType after validation', async () => {
      const env = buildEnvironment({ variables: [buildVariable({ value: '300', dataType: 'number' })] });

      const validated = await environmentSchema.validate(env);

      expect(validated.variables[0].dataType).toBe('number');
      expect(validated.variables[0].value).toBe('300');
    });
  });

  describe('extends', () => {
    it('preserves the parent environment name after validation', async () => {
      const env = buildEnvironment({ extends: 'base' });

      const validated = await environmentSchema.validate(env);

      expect(validated.extends).toBe('base');
    });

    it('validates an environment with no parent', async () => {
      await expect(environmentSchema.validate(buildEnvironment())).resolves.toBeTruthy();
    });

    it('validates an environment whose parent was cleared', async () => {
      await expect(environmentSchema.validate(buildEnvironment({ extends: null }))).resolves.toBeTruthy();
    });

    it('preserves a list of parents after validation', async () => {
      const env = buildEnvironment({ extends: ['base', 'shared'] });

      const validated = await environmentSchema.validate(env);

      expect(validated.extends).toEqual(['base', 'shared']);
    });

    it('rejects a parent reference that is neither a name nor a list of names', async () => {
      await expect(environmentSchema.validate(buildEnvironment({ extends: { parent: 'base' } }))).rejects.toThrow();
      await expect(environmentSchema.validate(buildEnvironment({ extends: [42] }))).rejects.toThrow();
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
