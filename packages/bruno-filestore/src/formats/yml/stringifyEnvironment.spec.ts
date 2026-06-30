import stringifyEnvironment, { toOpenCollectionEnvironmentVariables } from './stringifyEnvironment';
import parseEnvironment from './parseEnvironment';

describe('toOpenCollectionEnvironmentVariables', () => {
  it('returns undefined for null / empty input', () => {
    expect(toOpenCollectionEnvironmentVariables([])).toBeUndefined();
  });

  it('serializes plain string variables as raw strings', () => {
    const out = toOpenCollectionEnvironmentVariables([
      { uid: 'u1', name: 'apiKey', value: 'abc', type: 'text', enabled: true, secret: false } as any
    ]);

    expect(out).toEqual([{ name: 'apiKey', value: 'abc' }]);
  });

  it('serializes typed variables as a {type, data} struct', () => {
    const out = toOpenCollectionEnvironmentVariables([
      { uid: 'u1', name: 'port', value: 300, type: 'text', enabled: true, secret: false, dataType: 'number' } as any,
      { uid: 'u2', name: 'flag', value: true, type: 'text', enabled: true, secret: false, dataType: 'boolean' } as any,
      { uid: 'u3', name: 'config', value: { a: 1 }, type: 'text', enabled: true, secret: false, dataType: 'object' } as any
    ]);

    expect(out).toEqual([
      { name: 'port', value: { type: 'number', data: '300' } },
      { name: 'flag', value: { type: 'boolean', data: 'true' } },
      { name: 'config', value: { type: 'object', data: '{\n  "a": 1\n}' } }
    ]);
  });

  it('serializes secret variables without a value but preserves the dataType as `type`', () => {
    const out = toOpenCollectionEnvironmentVariables([
      { uid: 'u1', name: 'apiKey', value: '', type: 'text', enabled: true, secret: true } as any,
      { uid: 'u2', name: 'flag', value: '', type: 'text', enabled: false, secret: true, dataType: 'number' } as any
    ]);

    expect(out).toEqual([
      { secret: true, name: 'apiKey' },
      { secret: true, name: 'flag', type: 'number', disabled: true }
    ]);
  });

  it('marks disabled non-secret variables', () => {
    const out = toOpenCollectionEnvironmentVariables([
      { uid: 'u1', name: 'apiKey', value: 'abc', type: 'text', enabled: false, secret: false } as any
    ]);

    expect(out).toEqual([{ name: 'apiKey', value: 'abc', disabled: true }]);
  });
});

describe('stringifyEnvironment', () => {
  it('round-trips through parseEnvironment for typed and secret variables', () => {
    const env = {
      uid: 'env-uid',
      name: 'test_env',
      variables: [
        { uid: 'u1', name: 'env_str', value: 'hello', type: 'text', enabled: true, secret: false },
        { uid: 'u2', name: 'env_num', value: 300, type: 'text', enabled: true, secret: false, dataType: 'number' as const },
        { uid: 'u3', name: 'env_bool', value: true, type: 'text', enabled: true, secret: false, dataType: 'boolean' as const },
        { uid: 'u4', name: 'env_obj', value: { scope: 'env' }, type: 'text', enabled: true, secret: false, dataType: 'object' as const },
        { uid: 'u5', name: 'env_secret', value: '', type: 'text', enabled: true, secret: true },
        { uid: 'u6', name: 'env_secret_num', value: '', type: 'text', enabled: true, secret: true, dataType: 'number' as const }
      ]
    } as any;

    const yml = stringifyEnvironment(env);
    const reparsed = parseEnvironment(yml);

    expect(reparsed.name).toBe('test_env');
    expect(reparsed.variables[0]).toMatchObject({ name: 'env_str', value: 'hello', secret: false });
    expect(reparsed.variables[1]).toMatchObject({ name: 'env_num', value: 300, dataType: 'number', secret: false });
    expect(reparsed.variables[2]).toMatchObject({ name: 'env_bool', value: true, dataType: 'boolean', secret: false });
    expect(reparsed.variables[3]).toMatchObject({ name: 'env_obj', value: { scope: 'env' }, dataType: 'object', secret: false });
    expect(reparsed.variables[4]).toMatchObject({ name: 'env_secret', secret: true, value: '' });
    expect(reparsed.variables[4].dataType).toBeUndefined();
    expect(reparsed.variables[5]).toMatchObject({ name: 'env_secret_num', secret: true, value: '', dataType: 'number' });
  });

  it('preserves the color field when present', () => {
    const env = {
      uid: 'env-uid',
      name: 'colorful',
      color: '#ff0000',
      variables: []
    } as any;

    const reparsed = parseEnvironment(stringifyEnvironment(env));
    expect(reparsed.color).toBe('#ff0000');
  });
});
