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

  it('returns an empty list when there is no environments folder', () => {
    expect(loadEnvironments(collDir)).toEqual([]);
  });

  it('reads a JSON environment with its name and variables', () => {
    writeEnvFile(
      'Prod.json',
      JSON.stringify({ name: 'Prod', variables: [{ name: 'BASE_URL', value: 'https://prod', enabled: true }] })
    );

    const envs = loadEnvironments(collDir);
    expect(envs).toHaveLength(1);
    expect(envs[0].name).toBe('Prod');
    expect(envs[0].variables[0]).toMatchObject({ name: 'BASE_URL', value: 'https://prod' });
  });

  it('reads a .bru environment', () => {
    writeEnvFile('Local.bru', 'vars {\n  BASE_URL: http://localhost:8080\n}\n');

    const envs = loadEnvironments(collDir);
    expect(envs).toHaveLength(1);
    expect(envs[0].name).toBe('Local');
    expect(envs[0].variables.map((v) => v.name)).toContain('BASE_URL');
  });

  it('reads a .yml environment', () => {
    writeEnvFile('Staging.yml', 'name: Staging\n\nvariables:\n  - name: BASE_URL\n    value: https://staging\n');

    const envs = loadEnvironments(collDir);
    expect(envs).toHaveLength(1);
    expect(envs[0].name).toBe('Staging');
    expect(envs[0].variables.map((v) => v.name)).toContain('BASE_URL');
  });

  it('uses the file name as the environment name when the file has none', () => {
    writeEnvFile('NoName.bru', 'vars {\n  KEY: value\n}\n');

    expect(loadEnvironments(collDir)[0].name).toBe('NoName');
  });

  it('ignores files that are not environments', () => {
    writeEnvFile('Prod.json', JSON.stringify({ name: 'Prod', variables: [] }));
    writeEnvFile('notes.txt', 'ignore me');
    writeEnvFile('README.md', '# hello');

    expect(loadEnvironments(collDir).map((e) => e.name)).toEqual(['Prod']);
  });
});
