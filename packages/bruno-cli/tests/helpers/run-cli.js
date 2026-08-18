const path = require('path');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

// async spawn — spawnSync blocks jest's event loop and starves in-process HTTP stubs.
const runCli = (args, { cwd, env } = {}) => {
  if (!cwd) {
    throw new Error('runCli requires { cwd }');
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_BIN, ...args], {
      cwd,
      env: { ...process.env, ...(env || {}) }
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
};

module.exports = { runCli, CLI_BIN };
