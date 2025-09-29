const { describe, it, expect } = require('@jest/globals');
const { parseEnvironmentJson, getEnvVars } = require('../../src/utils/bru');

describe('parseEnvironmentJson', () => {
  it('normalizes single environment object', () => {
    const input = {
      name: 'My Env',
      variables: [
        { name: 'host', value: 'https://www.httpfaker.org' },
        { name: 'token', value: 'abc', enabled: false }
      ]
    };
    const env = parseEnvironmentJson(input);
    expect(Array.isArray(env.variables)).toBe(true);
    expect(env.variables[0]).toEqual({
      name: 'host',
      value: 'https://www.httpfaker.org',
      type: undefined,
      enabled: undefined,
      secret: undefined
    });

    const vars = getEnvVars(env);
    expect(Object.keys(vars)).toHaveLength(0);
  });

  it('throws on invalid shape', () => {
    expect(() => parseEnvironmentJson({ name: 'x' })).toThrow(/Invalid environment JSON/i);
  });
});
