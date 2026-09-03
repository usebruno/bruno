const path = require('path');
const fs = require('fs');
const os = require('os');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { loadEnvironments } = require('../../src/utils/environment');

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
