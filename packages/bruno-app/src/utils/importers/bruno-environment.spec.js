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
