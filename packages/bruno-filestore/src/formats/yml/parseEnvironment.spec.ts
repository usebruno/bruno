import parseEnvironment, { toBrunoEnvironmentVariables } from './parseEnvironment';

describe('toBrunoEnvironmentVariables', () => {
  it('returns an empty array for null / empty input', () => {
    expect(toBrunoEnvironmentVariables(null)).toEqual([]);
    expect(toBrunoEnvironmentVariables(undefined)).toEqual([]);
    expect(toBrunoEnvironmentVariables([])).toEqual([]);
  });

  it('parses a plain string variable as text with secret=false', () => {
    const [variable] = toBrunoEnvironmentVariables([{ name: 'apiKey', value: 'abc' } as any]);

    expect(variable).toMatchObject({
      name: 'apiKey',
      value: 'abc',
      type: 'text',
      enabled: true,
      secret: false
    });
    expect(variable.uid).toEqual(expect.any(String));
    expect(variable.datatype).toBeUndefined();
  });

  it('parses typed values and attaches the datatype field', () => {
    const vars = toBrunoEnvironmentVariables([
      { name: 'port', value: { type: 'number', data: '300' } } as any,
      { name: 'flag', value: { type: 'boolean', data: 'true' } } as any,
      { name: 'config', value: { type: 'object', data: '{"a":1}' } } as any
    ]);

    expect(vars[0]).toMatchObject({ name: 'port', value: 300, datatype: 'number', secret: false });
    expect(vars[1]).toMatchObject({ name: 'flag', value: true, datatype: 'boolean', secret: false });
    expect(vars[2]).toMatchObject({ name: 'config', value: { a: 1 }, datatype: 'object', secret: false });
  });

  it('parses secret variables with secret=true and never attaches a datatype', () => {
    const vars = toBrunoEnvironmentVariables([
      { secret: true, name: 'apiKey' } as any,
      { secret: true, name: 'port', type: 'number' } as any,
      { secret: true, name: 'flag', type: 'boolean', disabled: true } as any
    ]);

    expect(vars[0]).toMatchObject({ name: 'apiKey', secret: true, enabled: true, value: '' });
    expect(vars[0].datatype).toBeUndefined();
    expect(vars[1]).toMatchObject({ name: 'port', secret: true, enabled: true });
    expect(vars[1].datatype).toBeUndefined();
    expect(vars[2]).toMatchObject({ name: 'flag', secret: true, enabled: false });
    expect(vars[2].datatype).toBeUndefined();
  });

  it('honors the disabled flag on non-secret variables', () => {
    const [variable] = toBrunoEnvironmentVariables([
      { name: 'apiKey', value: 'abc', disabled: true } as any
    ]);

    expect(variable.enabled).toBe(false);
  });
});

describe('parseEnvironment (full yml)', () => {
  it('parses an environment with mixed plain, typed and secret variables', () => {
    const yml = `name: test_env
variables:
  - name: env_str
    value: hello
  - name: env_num
    value:
      type: number
      data: "300"
  - name: env_bool
    value:
      type: boolean
      data: "true"
  - name: env_obj
    value:
      type: object
      data: '{"scope":"env"}'
  - secret: true
    name: env_secret
`;

    const env = parseEnvironment(yml);

    expect(env.name).toBe('test_env');
    expect(env.variables).toHaveLength(5);

    expect(env.variables[0]).toMatchObject({ name: 'env_str', value: 'hello', secret: false });
    expect(env.variables[1]).toMatchObject({ name: 'env_num', value: 300, datatype: 'number', secret: false });
    expect(env.variables[2]).toMatchObject({ name: 'env_bool', value: true, datatype: 'boolean', secret: false });
    expect(env.variables[3]).toMatchObject({ name: 'env_obj', value: { scope: 'env' }, datatype: 'object', secret: false });
    expect(env.variables[4]).toMatchObject({ name: 'env_secret', secret: true, value: '' });
    expect(env.variables[4].datatype).toBeUndefined();
  });

  it('defaults environment name when missing', () => {
    const env = parseEnvironment('variables: []');
    expect(env.name).toBe('Untitled Environment');
    expect(env.variables).toEqual([]);
  });
});
