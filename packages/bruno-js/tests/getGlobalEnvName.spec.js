const Bru = require('../src/bru');

describe('bru.getGlobalEnvName', () => {
  const makeBru = (opts = {}) =>
    new Bru({
      runtime: 'quickjs',
      envVariables: {},
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test',
      globalEnvironmentVariables: {},
      ...opts
    });

  test('returns the active global environment name', () => {
    const bru = makeBru({ globalEnvironmentName: 'Production' });
    expect(bru.getGlobalEnvName()).toBe('Production');
  });

  test('returns undefined when no global environment is active', () => {
    const bru = makeBru();
    expect(bru.getGlobalEnvName()).toBeUndefined();
  });

  test('is independent of the collection environment name', () => {
    const bru = makeBru({ envVariables: { __name__: 'Local' }, globalEnvironmentName: 'Staging' });
    expect(bru.getEnvName()).toBe('Local');
    expect(bru.getGlobalEnvName()).toBe('Staging');
  });

  // The CLI carries the env name in-band as globalEnvironmentVariables.__name__.
  // Mirror the collection-env behaviour: __name__ is a reserved key, not a user var.
  test('getAllGlobalEnvVars strips the reserved __name__ key', () => {
    const bru = makeBru({ globalEnvironmentVariables: { __name__: 'Production', apiKey: 'abc' } });
    expect(bru.getAllGlobalEnvVars()).toEqual({ apiKey: 'abc' });
  });

  test('setGlobalEnvVar cannot overwrite the reserved __name__ key', () => {
    const bru = makeBru({ globalEnvironmentVariables: { __name__: 'Production' } });
    bru.setGlobalEnvVar('__name__', 'Other');
    expect(bru.globalEnvironmentVariables.__name__).toBe('Production');
    expect(bru._globalEnvDirty).toBeFalsy();
  });

  test('deleteGlobalEnvVar cannot remove the reserved __name__ key', () => {
    const bru = makeBru({ globalEnvironmentVariables: { __name__: 'Production' } });
    bru.deleteGlobalEnvVar('__name__');
    expect(bru.globalEnvironmentVariables.__name__).toBe('Production');
  });

  test('deleteAllGlobalEnvVars preserves the reserved __name__ key', () => {
    const bru = makeBru({ globalEnvironmentVariables: { __name__: 'Production', apiKey: 'abc' } });
    bru.deleteAllGlobalEnvVars();
    expect(bru.globalEnvironmentVariables).toEqual({ __name__: 'Production' });
  });

  test('is exposed in the QuickJS sandbox', async () => {
    const { executeQuickJsVm, loader } = require('../src/sandbox/quickjs');
    await loader();
    const result = executeQuickJsVm({
      script: 'bru.getGlobalEnvName()',
      context: { bru: makeBru({ globalEnvironmentName: 'Production' }) },
      scriptType: 'expression'
    });
    expect(result).toBe('Production');
  });
});
