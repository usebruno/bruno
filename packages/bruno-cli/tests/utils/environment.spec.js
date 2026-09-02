const os = require('os');
const fs = require('fs');
const path = require('path');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { stringifyEnvironment } = require('@usebruno/filestore');
const { getEnvVars } = require('../../src/utils/bru');
const { loadEnvironmentFromFile } = require('../../src/utils/environment');

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

// Inheritance walks the sibling files, so it applies to the collection and workspace environments
// — the ones the run names inside an `environments` directory — and not to a file passed by path
// (--env-file).
describe('loadEnvironmentFromFile', () => {
  let collectionDir;

  beforeEach(() => {
    collectionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-load-environment-'));
  });

  afterEach(() => {
    fs.rmSync(collectionDir, { recursive: true, force: true });
  });

  // Returns the path of the inheriting child, `dev`, written alongside the `base` it extends.
  const writeInheritingEnvironments = (directory) => {
    fs.mkdirSync(directory, { recursive: true });

    const write = ({ name, ...environment }) => {
      const filePath = path.join(directory, `${name}.yml`);
      fs.writeFileSync(filePath, stringifyEnvironment({ name, variables: [], ...environment }, { format: 'yml' }));
      return filePath;
    };

    write({ name: 'base', variables: [variable({ name: 'scheme', value: 'https', type: 'text' })] });

    return write({
      name: 'dev',
      extends: 'base',
      variables: [variable({ name: 'host', value: 'dev-host', type: 'text' })]
    });
  };

  it('inherits from the parent environment for a named environment', () => {
    const filePath = writeInheritingEnvironments(path.join(collectionDir, 'environments'));

    const { variables, inheritedVariables } = loadEnvironmentFromFile({ filePath, name: 'dev' });

    expect(variables).toEqual({ scheme: 'https', host: 'dev-host', __name__: 'dev' });
    expect(inheritedVariables.map((row) => row.name)).toEqual(['scheme']);
  });

  it('inherits nothing for an environment passed as an env file', () => {
    const filePath = writeInheritingEnvironments(path.join(collectionDir, 'environments'));

    const { variables, inheritedVariables } = loadEnvironmentFromFile({ filePath, isEnvFile: true });

    expect(variables).toEqual({ host: 'dev-host', __name__: 'dev' });
    expect(inheritedVariables).toEqual([]);
  });

  it('inherits nothing for an environment outside an environments directory', () => {
    const filePath = writeInheritingEnvironments(collectionDir);

    const { variables, inheritedVariables } = loadEnvironmentFromFile({ filePath, name: 'dev' });

    expect(variables).toEqual({ host: 'dev-host', __name__: 'dev' });
    expect(inheritedVariables).toEqual([]);
  });
});
