import { execFileSync, execSync } from 'node:child_process';

export const hasGitInstalled = () => {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

export const runGit = (cwd: string, args: string[]) => {
  return execFileSync('git', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  }).toString().trim();
};

export const currentGitBranch = (repoPath: string) => runGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
