const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { waitForShellEnv } = require('../store/shell-env-state');

const GH_TIMEOUT_MS = 10000;

const windowsInstallLocations = () => [
  path.join(process.env.ProgramFiles || 'C:\\Program Files', 'GitHub CLI', 'gh.exe'),
  path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'gh.exe'),
  path.join(os.homedir(), 'scoop', 'shims', 'gh.exe'),
  path.join(process.env.ProgramData || 'C:\\ProgramData', 'chocolatey', 'bin', 'gh.exe')
];

const runGh = (executable, args) => new Promise((resolve, reject) => {
  execFile(executable, args, { encoding: 'utf8', timeout: GH_TIMEOUT_MS, windowsHide: true }, (error, stdout) => {
    if (error) return reject(error);
    resolve(stdout.trim());
  });
});

const findGhExecutable = async () => {
  await waitForShellEnv().catch(() => {});
  const candidates = process.platform === 'win32'
    ? ['gh', ...windowsInstallLocations().filter((candidate) => fs.existsSync(candidate))]
    : ['gh'];
  for (const candidate of candidates) {
    try {
      await runGh(candidate, ['--version']);
      return candidate;
    } catch (err) {}
  }
  return null;
};

const readGitHubCliToken = async ({ hostname = 'github.com' } = {}) => {
  const executable = await findGhExecutable();
  if (!executable) return { installed: false, token: null };
  try {
    const token = await runGh(executable, ['auth', 'token', '--hostname', hostname]);
    return { installed: true, token: token || null };
  } catch (err) {
    return { installed: true, token: null };
  }
};

module.exports = { readGitHubCliToken };
