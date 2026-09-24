jest.mock('nanoid', () => ({
  nanoid: () => 'aaaaaaaaaaaaaaaaaaaa1',
  customAlphabet: () => () => 'aaaaaaaaaaaaaaaaaaaa1'
}));

import importBrunoEnvironment from './bruno-environment';

const parsedFile = (content, fileName = 'env.json') => ({ content, fileName });

const secret = (name) => ({ name, value: '', type: 'text', enabled: true, secret: true });

describe('importBrunoEnvironment — duplicate secrets', () => {
  it('collapses secrets sharing a name, keeping plain variables untouched', () => {
    const { valid: [environment] } = importBrunoEnvironment([
      parsedFile({
        name: 'test',
        variables: [
          { name: 'apiKey', value: 'dev-plain-value', type: 'text', enabled: true, secret: false },
          secret('name'),
          secret('name'),
          secret('abc'),
          secret('abc')
        ],
        info: { type: 'bruno-environment' }
      })
    ]);

    expect(environment.variables.map((v) => v.name)).toEqual(['apiKey', 'name', 'abc']);
    expect(environment.variables[0].value).toBe('dev-plain-value');
  });

  it('leaves an environment whose secret names are already unique alone', () => {
    const { valid: [environment] } = importBrunoEnvironment([
      parsedFile({ name: 'test', variables: [secret('token'), secret('apiKey')] })
    ]);

    expect(environment.variables.map((v) => v.name)).toEqual(['token', 'apiKey']);
  });

  it('keeps duplicate names on plain variables, which lose nothing to a collision', () => {
    const { valid: [environment] } = importBrunoEnvironment([
      parsedFile({
        name: 'test',
        variables: [
          { name: 'host', value: 'first', type: 'text', enabled: true, secret: false },
          { name: 'host', value: 'second', type: 'text', enabled: true, secret: false }
        ]
      })
    ]);

    expect(environment.variables.map((v) => v.value)).toEqual(['first', 'second']);
  });

  it('collapses duplicates in each environment of a multi-environment file', () => {
    const { valid: environments } = importBrunoEnvironment([
      parsedFile({
        info: { type: 'bruno-environment' },
        environments: [
          { name: 'dev', variables: [secret('token'), secret('token')] },
          { name: 'prod', variables: [secret('apiKey'), secret('apiKey'), secret('apiKey')] }
        ]
      })
    ]);

    expect(environments.map((env) => env.variables.length)).toEqual([1, 1]);
  });
});

describe('importBrunoEnvironment — inheritance', () => {
  const importSingleEnvironment = (env) => importBrunoEnvironment([parsedFile(env)]);

  it('carries the extends reference of a single environment', () => {
    const { valid: [environment] } = importBrunoEnvironment([
      parsedFile({ name: 'dev', variables: [], extends: 'Base', info: { type: 'bruno-environment' } })
    ]);

    expect(environment.extends).toBe('Base');
  });

  it('carries the extends reference of each environment of a multi-environment file', () => {
    const { valid: environments } = importBrunoEnvironment([
      parsedFile({
        info: { type: 'bruno-environment' },
        environments: [
          { name: 'base', variables: [] },
          { name: 'dev', variables: [], extends: 'base' }
        ]
      })
    ]);

    expect(environments.map((env) => env.extends)).toEqual([undefined, 'base']);
  });

  it('keeps a reference to an environment absent from the import', () => {
    const { valid: [environment] } = importBrunoEnvironment([
      parsedFile({ name: 'dev', variables: [], extends: 'NotImported' })
    ]);

    expect(environment.extends).toBe('NotImported');
  });

  it('carries a list of extends references', () => {
    const { valid: [environment] } = importBrunoEnvironment([
      parsedFile({ name: 'dev', variables: [], extends: ['base', 'shared'] })
    ]);

    expect(environment.extends).toEqual(['base', 'shared']);
  });

  it('rejects an extends reference carrying a newline, which would inject directives into the file', () => {
    const { valid, invalid } = importSingleEnvironment({
      name: 'dev',
      variables: [],
      extends: 'base\nvars {\n  injected: pwned\n}'
    });

    expect(valid).toEqual([]);
    expect(invalid[0].error).toMatch(/not a valid environment name/);
  });

  it('rejects a list holding an extends reference carrying a newline', () => {
    const { valid, invalid } = importSingleEnvironment({
      name: 'dev',
      variables: [],
      extends: ['base', 'shared\nvars {\n  injected: pwned\n}']
    });

    expect(valid).toEqual([]);
    expect(invalid[0].error).toMatch(/not a valid environment name/);
  });

  it('rejects an extends reference that is not a string', () => {
    const { valid, invalid } = importSingleEnvironment({ name: 'dev', variables: [], extends: 42 });

    expect(valid).toEqual([]);
    expect(invalid[0].error).toMatch(/not a valid environment name/);
  });

  it('rejects an extends reference of 0', () => {
    const { valid, invalid } = importSingleEnvironment({ name: 'dev', variables: [], extends: 0 });

    expect(valid).toEqual([]);
    expect(invalid[0].error).toMatch(/not a valid environment name/);
  });

  it('rejects an extends reference of false', () => {
    const { valid, invalid } = importSingleEnvironment({ name: 'dev', variables: [], extends: false });

    expect(valid).toEqual([]);
    expect(invalid[0].error).toMatch(/not a valid environment name/);
  });

  it('treats an empty extends reference as no inheritance', () => {
    const { valid: [environment], invalid } = importSingleEnvironment({ name: 'dev', variables: [], extends: '' });

    expect(invalid).toEqual([]);
    expect(environment.extends).toBeUndefined();
  });
});

describe('importBrunoEnvironment — environment names', () => {
  const importSingleEnvironment = (env) => importBrunoEnvironment([parsedFile(env)]);

  it.each([
    ['an integer', 123, '123'],
    ['a negative number', -1, '-1'],
    ['a decimal', 1.5, '1.5'],
    ['zero', 0, '0']
  ])('imports a name given as %s, as text', (_label, name, expected) => {
    const { valid, invalid } = importSingleEnvironment({ name, variables: [] });

    expect(invalid).toEqual([]);
    expect(valid[0].name).toBe(expected);
  });

  it.each([
    ['a boolean', true],
    ['an object', {}],
    ['an array', ['dev']],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
    ['whitespace only', '   ']
  ])('rejects a name that is %s', (_label, name) => {
    const { valid, invalid } = importSingleEnvironment({ name, variables: [] });

    expect(valid).toEqual([]);
    expect(invalid[0].error).toMatch(/missing or invalid name/);
  });

  it('keeps the rest of a multi-environment file when one name cannot be read as text', () => {
    const { valid, invalid } = importBrunoEnvironment([
      parsedFile({
        info: { type: 'bruno-environment' },
        environments: [
          { name: 'dev', variables: [] },
          { name: { nested: true }, variables: [] },
          { name: 'prod', variables: [] }
        ]
      })
    ]);

    expect(valid.map((env) => env.name)).toEqual(['dev', 'prod']);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].error).toMatch(/missing or invalid name/);
  });

  it('keeps the other files when one file carries an unusable name', () => {
    const { valid, invalid } = importBrunoEnvironment([
      parsedFile({ name: 'dev', variables: [] }, 'dev.json'),
      parsedFile({ name: ['a', 'b'], variables: [] }, 'broken.json'),
      parsedFile({ name: 'prod', variables: [] }, 'prod.json')
    ]);

    expect(valid.map((env) => env.name)).toEqual(['dev', 'prod']);
    expect(invalid).toEqual([expect.objectContaining({ fileName: 'broken.json' })]);
  });

  it('treats a numeric name as a conflict with the same name written as text', () => {
    const { valid } = importBrunoEnvironment([
      parsedFile({ name: 123, variables: [] }, 'numeric.json'),
      parsedFile({ name: '123', variables: [] }, 'text.json')
    ]);

    expect(valid.map((env) => env.name)).toEqual(['123', '123']);
  });
});

describe('importBrunoEnvironment — environment colour', () => {
  const importSingleEnvironment = (env) => importBrunoEnvironment([parsedFile(env)]);

  it('carries a colour polished can read', () => {
    const { valid: [environment], invalid } = importSingleEnvironment({ name: 'dev', variables: [], color: '#CE4F3B' });

    expect(invalid).toEqual([]);
    expect(environment.color).toBe('#CE4F3B');
  });

  it('imports the environment without a colour when the colour is unreadable', () => {
    const { valid: [environment], invalid } = importSingleEnvironment({ name: 'dev', variables: [], color: 'notacolor' });

    expect(invalid).toEqual([]);
    expect(environment.name).toBe('dev');
    expect(environment.color).toBeUndefined();
  });

  it('does not let a bad colour cost the other environments in the file', () => {
    const { valid, invalid } = importBrunoEnvironment([
      parsedFile({
        info: { type: 'bruno-environment' },
        environments: [
          { name: 'dev', variables: [], color: '#2E8A54' },
          { name: 'staging', variables: [], color: 'notacolor' },
          { name: 'prod', variables: [], color: 'red' }
        ]
      })
    ]);

    expect(invalid).toEqual([]);
    expect(valid.map((env) => [env.name, env.color])).toEqual([
      ['dev', '#2E8A54'],
      ['staging', undefined],
      ['prod', 'red']
    ]);
  });
});
