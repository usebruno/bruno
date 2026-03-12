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
});
