const { createCompatShim, createExplicitShim, buildShimMap, resolveNestedPath } = require('../../src/runtime/api-compat-shim');

const mockMigrations = [
  {
    simpleTranslations: {
      'bru.getEnvVar': 'bru.env.get',
      'bru.setEnvVar': 'bru.env.set',
      'bru.runner.skipRequest': 'bru.runner.skip'
    },
    docs: {
      'bru.getEnvVar': { reason: 'namespace change' },
      'bru.setEnvVar': { reason: 'namespace change' }
    }
  }
];

describe('buildShimMap', () => {
  it('should extract top-level deprecated properties', () => {
    const map = buildShimMap(mockMigrations);
    expect(map).toHaveProperty('getEnvVar');
    expect(map).toHaveProperty('setEnvVar');
    expect(map.getEnvVar.newPath).toBe('env.get');
  });

  it('should skip nested property paths', () => {
    // 'runner.skipRequest' is nested, should not be in shim map
    const map = buildShimMap(mockMigrations);
    expect(map).not.toHaveProperty('runner.skipRequest');
  });

  it('should skip non-bru translations', () => {
    const migrations = [{
      simpleTranslations: { 'pm.test': 'test' },
      docs: {}
    }];
    const map = buildShimMap(migrations);
    expect(Object.keys(map)).toHaveLength(0);
  });
});

describe('resolveNestedPath', () => {
  it('should resolve simple property', () => {
    const obj = { foo: 42 };
    expect(resolveNestedPath(obj, 'foo')).toBe(42);
  });

  it('should resolve nested property', () => {
    const obj = { env: { get: () => 'value' } };
    const result = resolveNestedPath(obj, 'env.get');
    expect(typeof result).toBe('function');
    expect(result()).toBe('value');
  });

  it('should return undefined for missing paths', () => {
    const obj = { env: {} };
    expect(resolveNestedPath(obj, 'env.missing')).toBeUndefined();
  });

  it('should bind functions to their parent', () => {
    const env = {
      data: 'test',
      get() { return this.data; }
    };
    const obj = { env };
    const fn = resolveNestedPath(obj, 'env.get');
    expect(fn()).toBe('test');
  });
});

describe('createCompatShim (Proxy-based)', () => {
  let bru;
  let warnings;

  beforeEach(() => {
    warnings = [];
    bru = {
      env: {
        get: (key) => `value_${key}`,
        set: (key, val) => { bru._stored = { key, val }; }
      },
      setVar: (key, val) => { bru._var = { key, val }; },
      _stored: null,
      _var: null
    };
  });

  it('should forward deprecated calls to new API', () => {
    const shimmed = createCompatShim(bru, (w) => warnings.push(w), mockMigrations);
    const result = shimmed.getEnvVar('test');
    expect(result).toBe('value_test');
  });

  it('should log deprecation warning', () => {
    const shimmed = createCompatShim(bru, (w) => warnings.push(w), mockMigrations);
    shimmed.getEnvVar('test');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].deprecated).toBe('bru.getEnvVar');
    expect(warnings[0].replacement).toBe('bru.env.get');
  });

  it('should pass through non-deprecated properties', () => {
    const shimmed = createCompatShim(bru, (w) => warnings.push(w), mockMigrations);
    shimmed.setVar('key', 'val');
    expect(bru._var).toEqual({ key: 'key', val: 'val' });
    expect(warnings).toHaveLength(0);
  });

  it('should return original bru if no shims needed', () => {
    const shimmed = createCompatShim(bru, (w) => warnings.push(w), []);
    expect(shimmed).toBe(bru);
  });
});

describe('createExplicitShim (QuickJS-compatible)', () => {
  let bru;
  let warnings;

  beforeEach(() => {
    warnings = [];
    bru = {
      env: {
        get: (key) => `value_${key}`,
        set: (key, val) => { bru._stored = { key, val }; }
      },
      _stored: null
    };
  });

  it('should add deprecated aliases that forward to new API', () => {
    createExplicitShim(bru, (w) => warnings.push(w), mockMigrations);
    const result = bru.getEnvVar('test');
    expect(result).toBe('value_test');
  });

  it('should log warning when deprecated alias is accessed', () => {
    createExplicitShim(bru, (w) => warnings.push(w), mockMigrations);
    bru.getEnvVar;
    expect(warnings).toHaveLength(1);
    expect(warnings[0].deprecated).toBe('bru.getEnvVar');
  });

  it('should not overwrite existing properties', () => {
    bru.getEnvVar = () => 'original';
    createExplicitShim(bru, (w) => warnings.push(w), mockMigrations);
    expect(bru.getEnvVar()).toBe('original');
    expect(warnings).toHaveLength(0);
  });
});
