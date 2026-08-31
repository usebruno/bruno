const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { runCli } = require('./helpers/run-cli');
const { copyFixtureToTmpDir, removeTmpDir } = require('./helpers/tmp-dir');

const fixtureDir = path.join(__dirname, '../../../bruno-tests/workspaces/onfail');

describe('CLI run — req.onFail handler writes reach the environment files', () => {
  let tmpDir;
  let collectionDir;
  let envFile;
  let globalEnvFile;

  beforeEach(() => {
    tmpDir = copyFixtureToTmpDir(fixtureDir, 'onfail');
    collectionDir = path.join(tmpDir, 'onfail-collection');
    envFile = path.join(collectionDir, 'environments', 'Test.yml');
    globalEnvFile = path.join(tmpDir, 'environments', 'Global.yml');
  });

  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('overwrites the original env and global env values with the ones the handler sets', async () => {
    // Verify both environments start at their original values
    const envBefore = fs.readFileSync(envFile, 'utf8');
    const globalEnvBefore = fs.readFileSync(globalEnvFile, 'utf8');

    expect(envBefore).toContain('value: original');
    expect(globalEnvBefore).toContain('value: original');
    expect(envBefore).not.toContain('value: updated');
    expect(globalEnvBefore).not.toContain('value: updated');

    // Run the request — the URL is unreachable, so the onFail handler runs
    const result = await runCli(
      ['run', 'onFail.yml', '--env', 'Test', '--global-env', 'Global', '--noproxy', '--sandbox', 'developer'],
      collectionDir
    );

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('connect ECONNREFUSED');

    // Verify the handler's writes reached both environment files, replacing the original values
    const envAfter = fs.readFileSync(envFile, 'utf8');
    const globalEnvAfter = fs.readFileSync(globalEnvFile, 'utf8');

    expect(envAfter).toContain('value: updated');
    expect(globalEnvAfter).toContain('value: updated');
    expect(envAfter).not.toContain('value: original');
    expect(globalEnvAfter).not.toContain('value: original');
  }, 60_000);
});
