const { safeMergeEnvDotEnvVars } = require('../../src/utils/env-dotenv-merge');

describe('safeMergeEnvDotEnvVars', () => {
  describe('basic merging', () => {
    it('should merge dotenv vars into envVars', () => {
      const envVars = { URL: 'https://example.com', __name__: 'stage' };
      safeMergeEnvDotEnvVars(envVars, { SECRET: 'abc' });
      expect(envVars.SECRET).toBe('abc');
      expect(envVars.URL).toBe('https://example.com');
    });

    it('should override existing keys', () => {
      const envVars = { SECRET: '', __name__: 'stage' };
      safeMergeEnvDotEnvVars(envVars, { SECRET: 'real-value' });
      expect(envVars.SECRET).toBe('real-value');
    });

    it('should return envVars unchanged when dotenv is empty', () => {
      const envVars = { URL: 'https://example.com', __name__: 'prod' };
      safeMergeEnvDotEnvVars(envVars, {});
      expect(envVars).toEqual({ URL: 'https://example.com', __name__: 'prod' });
    });

    it('should return envVars unchanged when dotenv is null', () => {
      const envVars = { URL: 'https://example.com', __name__: 'prod' };
      safeMergeEnvDotEnvVars(envVars, null);
      expect(envVars).toEqual({ URL: 'https://example.com', __name__: 'prod' });
    });

    it('should return envVars unchanged when dotenv is undefined', () => {
      const envVars = { URL: 'https://example.com', __name__: 'prod' };
      safeMergeEnvDotEnvVars(envVars, undefined);
      expect(envVars).toEqual({ URL: 'https://example.com', __name__: 'prod' });
    });
  });

  describe('__name__ preservation', () => {
    it('should preserve __name__ after merge', () => {
      const envVars = { __name__: 'stage' };
      safeMergeEnvDotEnvVars(envVars, { SECRET: 'abc' });
      expect(envVars.__name__).toBe('stage');
    });

    it('should preserve __name__ even when dotenv contains __name__', () => {
      const envVars = { __name__: 'stage' };
      safeMergeEnvDotEnvVars(envVars, { __name__: 'MALICIOUS', SECRET: 'abc' });
      expect(envVars.__name__).toBe('stage');
      expect(envVars.SECRET).toBe('abc');
    });
  });

  describe('prototype pollution prevention', () => {
    it('should filter __proto__ key', () => {
      const envVars = { __name__: 'stage' };
      safeMergeEnvDotEnvVars(envVars, { '__proto__': 'polluted', SECRET: 'abc' });
      expect(envVars.SECRET).toBe('abc');
      expect(({}).polluted).toBeUndefined();
    });

    it('should filter constructor key', () => {
      const envVars = { __name__: 'stage' };
      const original = envVars.constructor;
      safeMergeEnvDotEnvVars(envVars, { constructor: 'polluted', SECRET: 'abc' });
      expect(envVars.constructor).toBe(original);
      expect(envVars.SECRET).toBe('abc');
    });

    it('should filter prototype key', () => {
      const envVars = { __name__: 'stage' };
      safeMergeEnvDotEnvVars(envVars, { prototype: 'polluted', SECRET: 'abc' });
      expect(envVars.prototype).toBeUndefined();
      expect(envVars.SECRET).toBe('abc');
    });

    it('should allow normal keys while filtering dangerous ones', () => {
      const envVars = { __name__: 'prod' };
      safeMergeEnvDotEnvVars(envVars, {
        '__proto__': 'bad',
        constructor: 'bad',
        prototype: 'bad',
        API_KEY: 'good',
        PASSWORD: 'good'
      });
      expect(envVars.API_KEY).toBe('good');
      expect(envVars.PASSWORD).toBe('good');
      expect(envVars.__name__).toBe('prod');
    });
  });
});
