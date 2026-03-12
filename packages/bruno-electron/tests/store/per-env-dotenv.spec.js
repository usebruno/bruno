const {
  setEnvironmentDotEnvVars,
  getEnvironmentDotEnvVars,
  clearEnvironmentDotEnvVars
} = require('../../src/store/process-env');

describe('Per-environment dotenv storage', () => {
  const workspacePath = '/test/workspace';

  afterEach(() => {
    clearEnvironmentDotEnvVars(workspacePath);
  });

  describe('setEnvironmentDotEnvVars / getEnvironmentDotEnvVars', () => {
    it('should store and retrieve environment dotenv vars', () => {
      setEnvironmentDotEnvVars(workspacePath, 'stage', { SECRET: 'abc', API_KEY: '123' });
      expect(getEnvironmentDotEnvVars(workspacePath, 'stage')).toEqual({ SECRET: 'abc', API_KEY: '123' });
    });

    it('should return empty object for unknown environment', () => {
      expect(getEnvironmentDotEnvVars(workspacePath, 'unknown')).toEqual({});
    });

    it('should return empty object for unknown workspace', () => {
      expect(getEnvironmentDotEnvVars('/nonexistent', 'stage')).toEqual({});
    });

    it('should store different vars for different environments', () => {
      setEnvironmentDotEnvVars(workspacePath, 'stage', { A: '1' });
      setEnvironmentDotEnvVars(workspacePath, 'prod', { B: '2' });
      expect(getEnvironmentDotEnvVars(workspacePath, 'stage')).toEqual({ A: '1' });
      expect(getEnvironmentDotEnvVars(workspacePath, 'prod')).toEqual({ B: '2' });
    });

    it('should overwrite existing vars for same environment', () => {
      setEnvironmentDotEnvVars(workspacePath, 'stage', { OLD: 'value' });
      setEnvironmentDotEnvVars(workspacePath, 'stage', { NEW: 'value' });
      expect(getEnvironmentDotEnvVars(workspacePath, 'stage')).toEqual({ NEW: 'value' });
    });

    it('should isolate vars between different workspaces', () => {
      setEnvironmentDotEnvVars('/workspace-a', 'stage', { A: '1' });
      setEnvironmentDotEnvVars('/workspace-b', 'stage', { B: '2' });
      expect(getEnvironmentDotEnvVars('/workspace-a', 'stage')).toEqual({ A: '1' });
      expect(getEnvironmentDotEnvVars('/workspace-b', 'stage')).toEqual({ B: '2' });
      // cleanup
      clearEnvironmentDotEnvVars('/workspace-a');
      clearEnvironmentDotEnvVars('/workspace-b');
    });
  });

  describe('clearEnvironmentDotEnvVars', () => {
    it('should clear a specific environment', () => {
      setEnvironmentDotEnvVars(workspacePath, 'stage', { A: '1' });
      setEnvironmentDotEnvVars(workspacePath, 'prod', { B: '2' });
      clearEnvironmentDotEnvVars(workspacePath, 'stage');
      expect(getEnvironmentDotEnvVars(workspacePath, 'stage')).toEqual({});
      expect(getEnvironmentDotEnvVars(workspacePath, 'prod')).toEqual({ B: '2' });
    });

    it('should clear all environments for a workspace when no env name given', () => {
      setEnvironmentDotEnvVars(workspacePath, 'stage', { A: '1' });
      setEnvironmentDotEnvVars(workspacePath, 'prod', { B: '2' });
      setEnvironmentDotEnvVars(workspacePath, 'local', { C: '3' });
      clearEnvironmentDotEnvVars(workspacePath);
      expect(getEnvironmentDotEnvVars(workspacePath, 'stage')).toEqual({});
      expect(getEnvironmentDotEnvVars(workspacePath, 'prod')).toEqual({});
      expect(getEnvironmentDotEnvVars(workspacePath, 'local')).toEqual({});
    });

    it('should not affect other workspaces when clearing all', () => {
      setEnvironmentDotEnvVars('/workspace-a', 'stage', { A: '1' });
      setEnvironmentDotEnvVars('/workspace-b', 'stage', { B: '2' });
      clearEnvironmentDotEnvVars('/workspace-a');
      expect(getEnvironmentDotEnvVars('/workspace-a', 'stage')).toEqual({});
      expect(getEnvironmentDotEnvVars('/workspace-b', 'stage')).toEqual({ B: '2' });
      // cleanup
      clearEnvironmentDotEnvVars('/workspace-b');
    });

    it('should handle clearing non-existent environment gracefully', () => {
      expect(() => clearEnvironmentDotEnvVars(workspacePath, 'nonexistent')).not.toThrow();
    });

    it('should handle clearing non-existent workspace gracefully', () => {
      expect(() => clearEnvironmentDotEnvVars('/nonexistent')).not.toThrow();
    });
  });

  describe('__name__ preservation during merge', () => {
    /**
     * Regression test: getEnvVars() returns { ...vars, __name__: envName }.
     * When merging dotenv vars via Object.assign, a dotenv key called "__name__"
     * could overwrite the internal metadata. The merge pattern must preserve __name__.
     */

    // Simulate getEnvVars() output
    const getEnvVars = (environment = {}) => {
      const variables = environment.variables || [];
      const envVars = {};
      variables.forEach((v) => {
        if (v.enabled) envVars[v.name] = v.value;
      });
      return { ...envVars, __name__: environment.name };
    };

    // Simulate the safe merge pattern used in network/index.js
    const safeMerge = (envVars, envDotEnvVars) => {
      if (Object.keys(envDotEnvVars).length > 0) {
        const envName = envVars.__name__;
        Object.assign(envVars, envDotEnvVars);
        envVars.__name__ = envName;
      }
      return envVars;
    };

    it('should preserve __name__ when dotenv has no __name__ key', () => {
      const envVars = getEnvVars({
        name: 'stage',
        variables: [{ name: 'URL', value: 'https://stage.example.com', enabled: true }]
      });
      const dotEnvVars = { SECRET: 'abc123' };

      const result = safeMerge(envVars, dotEnvVars);
      expect(result.__name__).toBe('stage');
      expect(result.SECRET).toBe('abc123');
      expect(result.URL).toBe('https://stage.example.com');
    });

    it('should preserve __name__ even when dotenv contains a __name__ key', () => {
      const envVars = getEnvVars({
        name: 'stage',
        variables: [{ name: 'URL', value: 'https://stage.example.com', enabled: true }]
      });
      const dotEnvVars = { __name__: 'MALICIOUS_OVERRIDE', SECRET: 'abc123' };

      const result = safeMerge(envVars, dotEnvVars);
      expect(result.__name__).toBe('stage');
      expect(result.SECRET).toBe('abc123');
    });

    it('should not modify envVars when dotenv is empty', () => {
      const envVars = getEnvVars({
        name: 'prod',
        variables: [{ name: 'URL', value: 'https://prod.example.com', enabled: true }]
      });

      const result = safeMerge(envVars, {});
      expect(result.__name__).toBe('prod');
      expect(result.URL).toBe('https://prod.example.com');
    });

    it('should override yml values with dotenv values', () => {
      const envVars = getEnvVars({
        name: 'stage',
        variables: [
          { name: 'API_URL', value: 'https://stage.example.com', enabled: true },
          { name: 'SECRET', value: '', enabled: true }
        ]
      });
      const dotEnvVars = { SECRET: 'real-secret-from-env-file' };

      const result = safeMerge(envVars, dotEnvVars);
      expect(result.__name__).toBe('stage');
      expect(result.API_URL).toBe('https://stage.example.com');
      expect(result.SECRET).toBe('real-secret-from-env-file');
    });

    it('should add new keys from dotenv that do not exist in yml', () => {
      const envVars = getEnvVars({
        name: 'local',
        variables: [{ name: 'URL', value: 'http://localhost', enabled: true }]
      });
      const dotEnvVars = { NEW_VAR: 'only-in-dotenv' };

      const result = safeMerge(envVars, dotEnvVars);
      expect(result.__name__).toBe('local');
      expect(result.URL).toBe('http://localhost');
      expect(result.NEW_VAR).toBe('only-in-dotenv');
    });
  });
});
