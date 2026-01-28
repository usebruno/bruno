const { buildPersistedEnvVariables, mergeEnvVariables, buildPersistedNames } = require('./environments');

jest.mock('./common/index', () => ({
  uuid: () => 'mock-uid'
}));

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

describe('mergeEnvVariables', () => {
  test('updates existing var value, preserves metadata', () => {
    const existing = [{ uid: '1', name: 'foo', value: 'old', enabled: false, secret: true }];
    const newVars = { foo: 'new' };
    const result = mergeEnvVariables(existing, newVars);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('new');
    expect(result[0].uid).toBe('1');
    expect(result[0].enabled).toBe(false);
    expect(result[0].secret).toBe(true);
  });

  test('adds new vars not in existing', () => {
    const existing = [{ uid: '1', name: 'a', value: '1' }];
    const newVars = { b: '2' };
    const result = mergeEnvVariables(existing, newVars);
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('b');
    expect(result[1].value).toBe('2');
  });

  test('handles empty existing', () => {
    const result = mergeEnvVariables([], { x: 'y' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('x');
  });

  test('handles empty newVars', () => {
    const existing = [{ name: 'a', value: '1' }];
    const result = mergeEnvVariables(existing, {});
    expect(result).toEqual(existing);
  });
});

describe('buildPersistedNames', () => {
  test('includes all keys from persistentEnvVariables', () => {
    const result = buildPersistedNames({ a: '1', b: '2' }, [], {});
    expect(result.has('a')).toBe(true);
    expect(result.has('b')).toBe(true);
  });

  test('includes non-ephemeral vars that exist in envVariables', () => {
    const existing = [{ name: 'disk', value: 'v' }];
    const envVars = { disk: 'v' };
    const result = buildPersistedNames({}, existing, envVars);
    expect(result.has('disk')).toBe(true);
  });

  test('excludes non-ephemeral vars deleted from envVariables', () => {
    const existing = [{ name: 'deleted', value: 'v' }];
    const envVars = {};
    const result = buildPersistedNames({}, existing, envVars);
    expect(result.has('deleted')).toBe(false);
  });

  test('excludes ephemeral vars', () => {
    const existing = [{ name: 'eph', value: 'v', ephemeral: true }];
    const envVars = { eph: 'v' };
    const result = buildPersistedNames({}, existing, envVars);
    expect(result.has('eph')).toBe(false);
  });
});
