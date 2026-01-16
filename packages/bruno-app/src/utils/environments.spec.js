const { buildPersistedEnvVariables } = require('./environments');

describe('buildPersistedEnvVariables', () => {
  describe('mode: save', () => {
    test('keeps non-ephemeral variables unchanged', () => {
      const vars = [{ name: 'foo', value: 'bar', enabled: true }];
      const result = buildPersistedEnvVariables(vars, { mode: 'save' });
      expect(result).toEqual([{ name: 'foo', value: 'bar', enabled: true }]);
    });

    test('filters out ephemeral vars without persistedValue', () => {
      const vars = [
        { name: 'disk', value: 'v1', enabled: true },
        { name: 'runtime', value: 'v2', enabled: true, ephemeral: true }
      ];
      const result = buildPersistedEnvVariables(vars, { mode: 'save' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('disk');
    });

    test('restores ephemeral vars with persistedValue to original value', () => {
      const vars = [
        { name: 'overwritten', value: 'new', ephemeral: true, persistedValue: 'original' }
      ];
      const result = buildPersistedEnvVariables(vars, { mode: 'save' });
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('original');
    });

    test('strips ephemeral and persistedValue metadata', () => {
      const vars = [{ name: 'x', value: 'y', ephemeral: true, persistedValue: 'z' }];
      const result = buildPersistedEnvVariables(vars, { mode: 'save' });
      expect(result[0]).not.toHaveProperty('ephemeral');
      expect(result[0]).not.toHaveProperty('persistedValue');
    });

    test('handles empty array', () => {
      const result = buildPersistedEnvVariables([], { mode: 'save' });
      expect(result).toEqual([]);
    });

    test('handles null/undefined input', () => {
      expect(buildPersistedEnvVariables(null, { mode: 'save' })).toEqual([]);
      expect(buildPersistedEnvVariables(undefined, { mode: 'save' })).toEqual([]);
    });
  });

  describe('mode: merge', () => {
    test('includes vars in persistedNames set even if ephemeral', () => {
      const vars = [
        { name: 'explicit', value: 'v', ephemeral: true }
      ];
      const result = buildPersistedEnvVariables(vars, {
        mode: 'merge',
        persistedNames: new Set(['explicit'])
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('explicit');
    });

    test('filters out ephemeral vars not in persistedNames', () => {
      const vars = [
        { name: 'notPersisted', value: 'v', ephemeral: true }
      ];
      const result = buildPersistedEnvVariables(vars, {
        mode: 'merge',
        persistedNames: new Set()
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('default mode', () => {
    test('defaults to save mode when mode not specified', () => {
      const vars = [
        { name: 'disk', value: 'v1', enabled: true },
        { name: 'runtime', value: 'v2', enabled: true, ephemeral: true }
      ];
      const result = buildPersistedEnvVariables(vars);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('disk');
    });
  });
});
