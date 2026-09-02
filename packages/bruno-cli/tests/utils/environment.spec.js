const os = require('os');
const fs = require('fs');
const path = require('path');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { stringifyEnvironment } = require('@usebruno/filestore');
const { loadEnvironments } = require('../../src/utils/environment');
const { getEnvVars } = require('../../src/utils/bru');
const { loadEnvironmentFromFile } = require('../../src/utils/environment');

describe('loadEnvironments', () => {
  let collDir;

  beforeEach(() => {
    collDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-env-'));
  });

  afterEach(() => {
    fs.rmSync(collDir, { recursive: true, force: true });
  });

  const writeEnvFile = (fileName, content) => {
    const envDir = path.join(collDir, 'environments');
    fs.mkdirSync(envDir, { recursive: true });
    fs.writeFileSync(path.join(envDir, fileName), content);
  };

  it('returns an empty list when there is no environments folder', async () => {
    expect(await loadEnvironments(collDir, 'bru')).toEqual([]);
  });

  it('reads a .bru environment', async () => {
    writeEnvFile('Local.bru', 'vars {\n  BASE_URL: http://localhost:8080\n}\n');

    const envs = await loadEnvironments(collDir, 'bru');
    expect(envs).toHaveLength(1);
    expect(envs[0].name).toBe('Local');
    expect(envs[0].variables.map((v) => v.name)).toContain('BASE_URL');
  });

  it('reads a .yml environment', async () => {
    writeEnvFile('Staging.yml', 'name: Staging\n\nvariables:\n  - name: BASE_URL\n    value: https://staging\n');

    const envs = await loadEnvironments(collDir, 'yml');
    expect(envs).toHaveLength(1);
    expect(envs[0].name).toBe('Staging');
    expect(envs[0].variables.map((v) => v.name)).toContain('BASE_URL');
  });

  it('loads only the collection-format env, ignoring a same-named cross-format file', async () => {
    writeEnvFile('Prod.yml', 'name: Prod\nvariables:\n  - name: BASE_URL\n    value: https://prod-yml\n');
    writeEnvFile('Prod.bru', 'vars {\n  BASE_URL: https://prod-bru\n}\n');

    const envs = await loadEnvironments(collDir, 'yml');
    expect(envs.map((e) => e.name)).toEqual(['Prod']);
    expect(envs[0].variables.find((v) => v.name === 'BASE_URL').value).toBe('https://prod-yml');
  });

  it('ignores off-format and non-environment files', async () => {
    writeEnvFile('Prod.bru', 'vars {\n  KEY: value\n}\n');
    writeEnvFile('Staging.yml', 'name: Staging\nvariables: []\n');
    writeEnvFile('Legacy.json', JSON.stringify({ variables: [] }));
    writeEnvFile('notes.txt', 'ignore me');

    expect((await loadEnvironments(collDir, 'bru')).map((e) => e.name)).toEqual(['Prod']);
  });

  it('uses the file name as the environment name when the file has none', async () => {
    writeEnvFile('NoName.bru', 'vars {\n  KEY: value\n}\n');

    expect((await loadEnvironments(collDir, 'bru'))[0].name).toBe('NoName');
  });

  it('rejects with a clear error naming the file when a bru environment cannot be parsed', async () => {
    writeEnvFile('Broken.bru', '@@@ not valid bru @@@\n');

    await expect(loadEnvironments(collDir, 'bru')).rejects.toThrow(/Broken\.bru/);
  });

  it('matches the collection format extension case-insensitively', async () => {
    writeEnvFile('Prod.BRU', 'vars {\n  KEY: value\n}\n');

    expect((await loadEnvironments(collDir, 'bru'))[0].name).toBe('Prod');
  });

  it('names each environment after its file, ignoring any name stored inside it', async () => {
    writeEnvFile('Prod.yml', 'name: Renamed\nvariables:\n  - name: BASE_URL\n    value: https://prod\n');
    writeEnvFile('Dev.yml', 'name: AlsoRenamed\nvariables:\n  - name: BASE_URL\n    value: https://dev\n');

    expect((await loadEnvironments(collDir, 'yml')).map((e) => e.name)).toEqual(['Dev', 'Prod']);
  });

  it('names a yml environment after its file even when the file omits a name', async () => {
    writeEnvFile('Prod.yml', 'variables:\n  - name: BASE_URL\n    value: https://prod\n');
    writeEnvFile('Dev.yml', 'variables:\n  - name: BASE_URL\n    value: https://dev\n');

    expect((await loadEnvironments(collDir, 'yml')).map((e) => e.name)).toEqual(['Dev', 'Prod']);
  });

  it('sorts the environments by name to match the app', async () => {
    writeEnvFile('Zeta.bru', 'vars {\n  K: v\n}\n');
    writeEnvFile('Alpha.bru', 'vars {\n  K: v\n}\n');

    expect((await loadEnvironments(collDir, 'bru')).map((e) => e.name)).toEqual(['Alpha', 'Zeta']);
  });
});

describe('getEnvVars', () => {
  const variable = (props) => ({ enabled: true, secret: false, ...props });
  const secret = (props) => variable({ ...props, secret: true });

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
