const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const { describe, it, expect, afterEach } = require('@jest/globals');
const { getGitRemoteUrl } = require('../../src/utils/git');

describe('getGitRemoteUrl', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = undefined;
    }
  });

  const makeTmpDir = () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-git-'));
    return tmpDir;
  };

  it('returns undefined when the folder is not a git repo', () => {
    expect(getGitRemoteUrl(makeTmpDir())).toBeUndefined();
  });

  it('returns undefined when the repo has no origin remote', () => {
    const dir = makeTmpDir();
    execSync('git init', { cwd: dir, stdio: 'ignore' });
    expect(getGitRemoteUrl(dir)).toBeUndefined();
  });

  it('returns the origin url when the repo has one', () => {
    const dir = makeTmpDir();
    execSync('git init', { cwd: dir, stdio: 'ignore' });
    execSync('git remote add origin https://example.com/team/repo.git', { cwd: dir, stdio: 'ignore' });
    expect(getGitRemoteUrl(dir)).toBe('https://example.com/team/repo.git');
  });
});
