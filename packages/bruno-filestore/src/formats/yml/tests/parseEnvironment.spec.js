import parseEnvironment from '../parseEnvironment';
import stringifyEnvironment from '../stringifyEnvironment';

const ENV_YML = `name: test_env
variables:
  - name: env_str
    value: env_string
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
      data: |-
        {
          "scope": "env"
        }
  - name: falsy_num
    value:
      type: number
      data: "0"
  - name: falsy_bool
    value:
      type: boolean
      data: "false"
  - secret: true
    name: env_secret_str
  - secret: true
    name: env_secret_num
    type: number
  - secret: true
    name: env_secret_bool
    type: boolean
  - secret: true
    name: env_secret_obj
    type: object
  - name: env_array_obj
    value:
      type: object
      data: "[1,2,3,4]"
`;

const byName = (env) => Object.fromEntries(env.variables.map((v) => [v.name, v]));

describe('yml parseEnvironment - typed values', () => {
  it('keeps the value as a string and preserves the type via datatype', () => {
    const variables = byName(parseEnvironment(ENV_YML));

    expect(variables.env_num).toMatchObject({ value: '300', type: 'text', datatype: 'number' });
    expect(typeof variables.env_num.value).toBe('string');

    expect(variables.env_bool).toMatchObject({ value: 'true', datatype: 'boolean' });
    expect(variables.falsy_num).toMatchObject({ value: '0', datatype: 'number' });
    expect(variables.falsy_bool).toMatchObject({ value: 'false', datatype: 'boolean' });

    expect(variables.env_obj.datatype).toBe('object');
    expect(typeof variables.env_obj.value).toBe('string');
    expect(variables.env_obj.value).toContain('"scope": "env"');

    expect(variables.env_array_obj).toMatchObject({ value: '[1,2,3,4]', datatype: 'object' });
  });

  it('does not set datatype for plain string values', () => {
    const variables = byName(parseEnvironment(ENV_YML));

    expect(variables.env_str).toMatchObject({ value: 'env_string', type: 'text', secret: false });
    expect(variables.env_str).not.toHaveProperty('datatype');
  });

  it('parses secret variables with no value or datatype', () => {
    const variables = byName(parseEnvironment(ENV_YML));

    expect(variables.env_secret_str).toMatchObject({ name: 'env_secret_str', value: '', secret: true });
    expect(variables.env_secret_str).not.toHaveProperty('datatype');
  });

  it('parses secret variables with a type, keeping the value empty and the type in datatype', () => {
    const variables = byName(parseEnvironment(ENV_YML));

    expect(variables.env_secret_num).toMatchObject({ value: '', secret: true, datatype: 'number' });
    expect(variables.env_secret_bool).toMatchObject({ value: '', secret: true, datatype: 'boolean' });
    expect(variables.env_secret_obj).toMatchObject({ value: '', secret: true, datatype: 'object' });
  });

  it('serializes secret variable datatype back to a type field, omitting it for plain secrets', () => {
    const yml = stringifyEnvironment(parseEnvironment(ENV_YML));

    expect(yml).toContain('- secret: true\n    name: env_secret_num\n    type: number');
    expect(yml).toContain('- secret: true\n    name: env_secret_bool\n    type: boolean');
    expect(yml).toContain('- secret: true\n    name: env_secret_obj\n    type: object');
    expect(yml).toContain('- secret: true\n    name: env_secret_str');
    expect(yml).not.toContain('name: env_secret_str\n    type:');
  });

  it('serializes datatype back to an OpenCollection { type, data } value', () => {
    const yml = stringifyEnvironment(parseEnvironment(ENV_YML));

    expect(yml).toContain('type: number');
    expect(yml).toContain('data: "300"');
    expect(yml).toContain('type: boolean');
    expect(yml).toContain('type: object');
    // plain strings stay plain, never wrapped as a string datatype
    expect(yml).toContain('value: env_string');
    expect(yml).not.toContain('type: string');
  });

  it('round-trips value and datatype through parse -> stringify -> parse', () => {
    const env = parseEnvironment(ENV_YML);
    const reparsed = parseEnvironment(stringifyEnvironment(env));

    const withoutUid = (e) => e.variables.map(({ uid, ...rest }) => rest);
    expect(withoutUid(reparsed)).toEqual(withoutUid(env));
  });
});

const EXTERNAL_SECRETS_YML = `name: test_env
variables:
  - name: env_str
    value: env_string
externalSecrets:
  type: my-vault
  variables:
    - name: by_path
      path: secret/data/secret
    - name: by_secret_name
      secretName: secret
    - name: by_vault_name
      vaultName: secret
`;

describe('yml parseEnvironment - external secrets', () => {
  it('parses externalSecrets, preserving the type and arbitrary variable keys', () => {
    const env = parseEnvironment(EXTERNAL_SECRETS_YML);

    expect(env.externalSecrets).toEqual({
      type: 'my-vault',
      variables: [
        { name: 'by_path', path: 'secret/data/secret' },
        { name: 'by_secret_name', secretName: 'secret' },
        { name: 'by_vault_name', vaultName: 'secret' }
      ]
    });
  });

  it('does not set externalSecrets when the yml has none', () => {
    const env = parseEnvironment('name: test_env\nvariables: []\n');
    expect(env.externalSecrets).toBeUndefined();
  });

  it('round-trips externalSecrets through parse -> stringify -> parse', () => {
    const env = parseEnvironment(EXTERNAL_SECRETS_YML);
    const reparsed = parseEnvironment(stringifyEnvironment(env));

    expect(reparsed.externalSecrets).toEqual(env.externalSecrets);
  });
});
