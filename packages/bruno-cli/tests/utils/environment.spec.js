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

// Whether the `extends` chain is resolved is the caller's choice, not a property of where the file
// sits: an environment the run names (--env, --global-env) inherits, one it is pointed at by path
// (--env-file) is loaded as the file reads.
describe('loadEnvironmentFromFile', () => {
  let environmentsDir;

  beforeEach(() => {
    environmentsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-load-environment-'));
  });

  afterEach(() => {
    fs.rmSync(environmentsDir, { recursive: true, force: true });
  });

  // Returns the path of the inheriting child, `dev`, written alongside the `base` it extends.
  const writeInheritingEnvironments = () => {
    const write = ({ name, ...environment }) => {
      const filePath = path.join(environmentsDir, `${name}.yml`);
      fs.writeFileSync(filePath, stringifyEnvironment({ name, variables: [], ...environment }, { format: 'yml' }));
      return filePath;
    };

    write({
      name: 'base',
      variables: [
        variable({ name: 'scheme', value: 'https', type: 'text' }),
        secret({ name: 'token', value: '', type: 'text' })
      ]
    });

    return write({
      name: 'dev',
      extends: 'base',
      variables: [
        variable({ name: 'host', value: 'dev-host', type: 'text' }),
        variable({ name: 'port', value: '8081', type: 'text', enabled: false })
      ]
    });
  };

  it('resolves the parent environment into the variables by default', () => {
    const filePath = writeInheritingEnvironments();

    const { variables, inheritedVariables } = loadEnvironmentFromFile({ filePath, name: 'dev' });

    expect(variables).toEqual({ scheme: 'https', token: '', host: 'dev-host', __name__: 'dev' });
    expect(inheritedVariables.map((row) => row.name)).toEqual(['scheme', 'token']);
  });

  // Nothing a parent declares reaches the runtime map, so no name the run is not pointed at can
  // travel with it — a parent's secret least of all.
  it('leaves the parent environment out entirely when inheritance is off', () => {
    const filePath = writeInheritingEnvironments();

    const { variables, inheritedVariables } = loadEnvironmentFromFile({
      filePath,
      name: 'dev',
      resolveInheritance: false
    });

    expect(variables).toEqual({ host: 'dev-host', __name__: 'dev' });
    expect(inheritedVariables).toEqual([]);
  });

  it('names the environment after the file even when its extension is uppercased', () => {
    const filePath = path.join(environmentsDir, 'dev.YML');
    const environment = { name: 'dev', variables: [variable({ name: 'host', value: 'dev-host', type: 'text' })] };
    fs.writeFileSync(filePath, stringifyEnvironment(environment, { format: 'yml' }));

    const { variables } = loadEnvironmentFromFile({ filePath });

    expect(variables.__name__).toBe('dev');
  });

  // A caller loading this file alongside another environment writes the other one back, and uses
  // these entries to know which names it must leave to this file.
  it('reports the enabled entries the file itself declares as its own variables', () => {
    const filePath = writeInheritingEnvironments();

    const { ownVariables } = loadEnvironmentFromFile({ filePath, name: 'dev', resolveInheritance: false });

    expect(ownVariables.map((row) => row.name)).toEqual(['host']);
  });
});
