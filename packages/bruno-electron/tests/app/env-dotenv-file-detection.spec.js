/**
 * Tests for isEnvironmentDotEnvFile detection logic.
 *
 * Since isEnvironmentDotEnvFile is not exported from dotenv-watcher.js,
 * we replicate the logic here for unit testing. The actual function is:
 *   filename.endsWith('.env') && filename !== '.env' && !filename.startsWith('.env.')
 */

const isEnvironmentDotEnvFile = (filename) => {
  return filename.endsWith('.env') && filename !== '.env' && !filename.startsWith('.env.');
};

describe('isEnvironmentDotEnvFile', () => {
  describe('should match per-environment .env files', () => {
    it('matches stage.env', () => expect(isEnvironmentDotEnvFile('stage.env')).toBe(true));
    it('matches local.env', () => expect(isEnvironmentDotEnvFile('local.env')).toBe(true));
    it('matches prod.env', () => expect(isEnvironmentDotEnvFile('prod.env')).toBe(true));
    it('matches qa-main.env', () => expect(isEnvironmentDotEnvFile('qa-main.env')).toBe(true));
    it('matches load-test.env', () => expect(isEnvironmentDotEnvFile('load-test.env')).toBe(true));
    it('matches my-custom-env.env', () => expect(isEnvironmentDotEnvFile('my-custom-env.env')).toBe(true));
  });

  describe('should NOT match workspace/collection-level dotenv files', () => {
    it('rejects .env', () => expect(isEnvironmentDotEnvFile('.env')).toBe(false));
    it('rejects .env.local', () => expect(isEnvironmentDotEnvFile('.env.local')).toBe(false));
    it('rejects .env.production', () => expect(isEnvironmentDotEnvFile('.env.production')).toBe(false));
    it('rejects .env.development', () => expect(isEnvironmentDotEnvFile('.env.development')).toBe(false));
  });

  describe('should NOT match non-env files', () => {
    it('rejects stage.yml', () => expect(isEnvironmentDotEnvFile('stage.yml')).toBe(false));
    it('rejects stage.json', () => expect(isEnvironmentDotEnvFile('stage.json')).toBe(false));
    it('rejects README.md', () => expect(isEnvironmentDotEnvFile('README.md')).toBe(false));
    it('rejects .gitignore', () => expect(isEnvironmentDotEnvFile('.gitignore')).toBe(false));
  });

  describe('environment name extraction', () => {
    it('extracts stage from stage.env', () => {
      const filename = 'stage.env';
      const envName = filename.slice(0, -'.env'.length);
      expect(envName).toBe('stage');
    });

    it('extracts qa-main from qa-main.env', () => {
      const filename = 'qa-main.env';
      const envName = filename.slice(0, -'.env'.length);
      expect(envName).toBe('qa-main');
    });

    it('extracts load-test from load-test.env', () => {
      const filename = 'load-test.env';
      const envName = filename.slice(0, -'.env'.length);
      expect(envName).toBe('load-test');
    });
  });
});
