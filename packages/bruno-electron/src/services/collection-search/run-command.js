const { execFile } = require('node:child_process');
const path = require('node:path');

const runCommand = (file, args, timeout, env) =>
  new Promise((resolve) => {
    execFile(file, args, { timeout, windowsHide: true, env }, (error, stdout) => {
      resolve(error ? null : String(stdout));
    });
  });

const getPowerShellPath = (env) =>
  path.win32.join(env.SystemRoot || env.windir || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

module.exports = {
  runCommand,
  getPowerShellPath
};
