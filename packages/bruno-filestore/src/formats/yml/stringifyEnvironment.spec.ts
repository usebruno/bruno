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

  it('omits empty and null descriptions on plain and secret variables', () => {
    const out = toOpenCollectionEnvironmentVariables([
      { uid: 'u1', name: 'emptyDesc', value: 'a', type: 'text', enabled: true, secret: false, description: '' } as any,
      { uid: 'u2', name: 'nullDesc', value: 'b', type: 'text', enabled: true, secret: false, description: null } as any,
      { uid: 'u3', name: 'noDesc', value: 'c', type: 'text', enabled: true, secret: false } as any,
      { uid: 'u4', name: 'emptySecretDesc', value: '', type: 'text', enabled: true, secret: true, description: '' } as any,
      { uid: 'u5', name: 'nullSecretDesc', value: '', type: 'text', enabled: true, secret: true, description: null } as any
    ]);

    expect(out).toEqual([
      { name: 'emptyDesc', value: 'a' },
      { name: 'nullDesc', value: 'b' },
      { name: 'noDesc', value: 'c' },
      { secret: true, name: 'emptySecretDesc' },
      { secret: true, name: 'nullSecretDesc' }
    ]);
  });

  it('keeps non-empty descriptions on plain and secret variables', () => {
    const out = toOpenCollectionEnvironmentVariables([
      { uid: 'u1', name: 'baseUrl', value: 'https://api.example.com', type: 'text', enabled: true, secret: false, description: 'API host' } as any,
      { uid: 'u2', name: 'token', value: '', type: 'text', enabled: true, secret: true, description: 'Auth token' } as any
    ]);

    expect(out).toEqual([
      { name: 'baseUrl', value: 'https://api.example.com', description: 'API host' },
      { secret: true, name: 'token', description: 'Auth token' }
    ]);
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

  describe('descriptions', () => {
    it('writes no description for an empty or null description', () => {
      const env = {
        uid: 'env-uid',
        name: 'local',
        variables: [
          { uid: 'u1', name: 'host', value: 'localhost', type: 'text', enabled: true, secret: false, description: '' },
          { uid: 'u2', name: 'port', value: '8080', type: 'text', enabled: true, secret: false, description: null },
          { uid: 'u3', name: 'token', value: '', type: 'text', enabled: true, secret: true, description: '' }
        ]
      } as any;

      expect(stringifyEnvironment(env)).not.toContain('description');
    });

    it('round-trips non-empty descriptions on plain and secret variables', () => {
      const env = {
        uid: 'env-uid',
        name: 'local',
        variables: [
          { uid: 'u1', name: 'host', value: 'localhost', type: 'text', enabled: true, secret: false, description: 'API host' },
          { uid: 'u2', name: 'token', value: '', type: 'text', enabled: true, secret: true, description: 'Line one\nLine two' }
        ]
      } as any;

      const reparsed = parseEnvironment(stringifyEnvironment(env));

      expect(reparsed.variables[0]).toMatchObject({ name: 'host', description: 'API host' });
      expect(reparsed.variables[1]).toMatchObject({ name: 'token', secret: true, description: 'Line one\nLine two' });
    });

    it('changes only the updated value when a parsed environment is re-saved', () => {
      // The environment editor gives every row a description ('' when unset), while a script's
      // persisted update re-saves the environment as parsed from disk. Both must write the same bytes.
      const env = {
        uid: 'env-uid',
        name: 'local',
        variables: [
          { uid: 'u1', name: 'host', value: 'localhost', type: 'text', enabled: true, secret: false, description: 'API host' },
          { uid: 'u2', name: 'user', value: 'alice', type: 'text', enabled: true, secret: false, description: '' },
          { uid: 'u3', name: 'token', value: 'old', type: 'text', enabled: true, secret: false, description: '' },
          { uid: 'u4', name: 'apiKey', value: '', type: 'text', enabled: true, secret: true, description: '' }
        ]
      } as any;

      const savedYml = stringifyEnvironment(env);
      const parsed = parseEnvironment(savedYml);

      expect(stringifyEnvironment(parsed)).toBe(savedYml);

      const updated = {
        ...parsed,
        variables: parsed.variables.map((v: any) => (v.name === 'token' ? { ...v, value: 'new' } : v))
      };
      const savedLines = savedYml.split('\n');
      const updatedLines = stringifyEnvironment(updated).split('\n');
      const changedLines = updatedLines.filter((line, index) => line !== savedLines[index]);

      expect(updatedLines).toHaveLength(savedLines.length);
      expect(changedLines).toEqual([expect.stringMatching(/^\s*value: new$/)]);
    });

    it('drops the empty description lines an earlier version wrote', () => {
      const yml = [
        'name: local',
        'variables:',
        '  - name: host',
        '    value: localhost',
        '    description: API host',
        '  - name: user',
        '    value: alice',
        '    description: ""',
        '  - secret: true',
        '    name: apiKey',
        '    description: ""',
        ''
      ].join('\n');

      const resaved = stringifyEnvironment(parseEnvironment(yml));

      expect(resaved.match(/description:/g)).toHaveLength(1);
      expect(parseEnvironment(resaved).variables).toMatchObject([
        { name: 'host', value: 'localhost', description: 'API host' },
        { name: 'user', value: 'alice' },
        { name: 'apiKey', secret: true }
      ]);
    });
  });

  describe('extends', () => {
    it('round-trips the parent environment name', () => {
      const env = {
        uid: 'env-uid',
        name: 'prod',
        extends: 'base',
        variables: [{ uid: 'u1', name: 'host', value: 'prod.example.com', type: 'text', enabled: true, secret: false }]
      } as any;

      const reparsed = parseEnvironment(stringifyEnvironment(env));

      expect(reparsed.extends).toBe('base');
      expect(reparsed.variables[0]).toMatchObject({ name: 'host', value: 'prod.example.com' });
    });

    it('omits extends when no parent is set', () => {
      const env = { uid: 'env-uid', name: 'prod', variables: [] } as any;

      expect(stringifyEnvironment(env)).not.toContain('extends');
    });

    it('omits extends when the parent names nothing', () => {
      const env = { uid: 'env-uid', name: 'prod', extends: '  ', variables: [] } as any;

      expect(stringifyEnvironment(env)).not.toContain('extends');
    });

    it('round-trips a list of parents', () => {
      const env = { uid: 'env-uid', name: 'prod', extends: ['base', 'shared'], variables: [] } as any;

      const reparsed = parseEnvironment(stringifyEnvironment(env));

      expect(reparsed.extends).toEqual(['base', 'shared']);
    });

    it('omits extends when the list of parents is empty', () => {
      const env = { uid: 'env-uid', name: 'prod', extends: [], variables: [] } as any;

      expect(stringifyEnvironment(env)).not.toContain('extends');
    });

    it('never writes the inheritedFrom provenance of a resolved variable', () => {
      const env = {
        uid: 'env-uid',
        name: 'prod',
        extends: 'base',
        variables: [
          { uid: 'u1', name: 'host', value: 'base.example.com', type: 'text', enabled: true, secret: false, inheritedFrom: 'base' }
        ]
      } as any;

      const yml = stringifyEnvironment(env);

      expect(yml).not.toContain('inheritedFrom');
      expect(parseEnvironment(yml).variables[0]).not.toHaveProperty('inheritedFrom');
    });
  });
});
