const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runCli } = require('./helpers/run-cli');

const FIXTURE_DIR = path.join(__dirname, '../../../bruno-tests/workspaces/onfail');

describe('CLI run — req.onFail handler writes reach the environment files', () => {
  let tmpDir;
  let collectionDir;
  let envFile;
  let globalEnvFile;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-onfail-'));
    fs.cpSync(FIXTURE_DIR, tmpDir, { recursive: true });
    collectionDir = path.join(tmpDir, 'onfail-collection');
    envFile = path.join(collectionDir, 'environments', 'Test.yml');
    globalEnvFile = path.join(tmpDir, 'environments', 'Global.yml');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('overwrites the original env and global env values with the ones the handler sets', async () => {
    expect(fs.readFileSync(envFile, 'utf8')).toContain('value: original');
    expect(fs.readFileSync(globalEnvFile, 'utf8')).toContain('value: original');

    await runCli(
      ['run', 'onFail.yml', '--env', 'Test', '--global-env', 'Global', '--noproxy', '--sandbox', 'developer'],
      collectionDir
    );

    const env = fs.readFileSync(envFile, 'utf8');
    const globalEnv = fs.readFileSync(globalEnvFile, 'utf8');

    expect(env).toContain('value: updated');
    expect(globalEnv).toContain('value: updated');

    expect(env).not.toContain('value: original');
    expect(globalEnv).not.toContain('value: original');
  }, 60_000);
});
