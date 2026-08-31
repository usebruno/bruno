const { describe, it, expect } = require('@jest/globals');
const { getEnvVars } = require('../../src/utils/bru');

const variable = (props) => ({ enabled: true, secret: false, ...props });

const secret = (props) => variable({ ...props, secret: true });

describe('getEnvVars', () => {
  it('returns an empty object for an environment with no variables', () => {
    expect(getEnvVars({})).toEqual({});
  });

  it('flattens the inherited variables ahead of the environment own variables', () => {
    const environment = {
      inheritedVariables: [variable({ name: 'scheme', value: 'https' }), variable({ name: 'host', value: 'base-host' })],
      variables: [variable({ name: 'host', value: 'dev-host' })]
    };

    expect(getEnvVars(environment)).toEqual({ scheme: 'https', host: 'dev-host' });
  });

  it('skips disabled variables', () => {
    const environment = {
      variables: [variable({ name: 'host', value: 'dev-host', enabled: false })]
    };

    expect(getEnvVars(environment)).toEqual({});
  });

  it('lets a secret win over a plain variable of the same name declared after it', () => {
    const environment = {
      variables: [secret({ name: 'token', value: 'secret-token' }), variable({ name: 'token', value: 'plain-token' })]
    };

    expect(getEnvVars(environment)).toEqual({ token: 'secret-token' });
  });

  it('lets an inherited secret win over a plain variable of the same name on the environment', () => {
    const environment = {
      inheritedVariables: [secret({ name: 'token', value: 'base-secret' })],
      variables: [variable({ name: 'token', value: 'dev-plain-token' })]
    };

    expect(getEnvVars(environment)).toEqual({ token: 'base-secret' });
  });

  it('lets a secret on the environment win over an inherited plain variable of the same name', () => {
    const environment = {
      inheritedVariables: [variable({ name: 'token', value: 'base-plain-token' })],
      variables: [secret({ name: 'token', value: 'dev-secret' })]
    };

    expect(getEnvVars(environment)).toEqual({ token: 'dev-secret' });
  });

  it('lets a secret on the environment win over an inherited secret of the same name', () => {
    const environment = {
      inheritedVariables: [secret({ name: 'token', value: 'base-secret' })],
      variables: [secret({ name: 'token', value: 'dev-secret' })]
    };

    expect(getEnvVars(environment)).toEqual({ token: 'dev-secret' });
  });

  it('ignores a disabled secret so the plain variable of the same name stands', () => {
    const environment = {
      variables: [
        variable({ name: 'token', value: 'plain-token' }),
        secret({ name: 'token', value: 'secret-token', enabled: false })
      ]
    };

    expect(getEnvVars(environment)).toEqual({ token: 'plain-token' });
  });
});
