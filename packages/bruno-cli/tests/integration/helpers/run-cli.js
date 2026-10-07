const path = require('path');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', '..', 'bin', 'bru.js');

// spawnSync blocks jest's event loop, starving any in-process HTTP server → ECONNREFUSED.
// Use async spawn so the server stays responsive.
const runCli = (args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_BIN, ...args], { cwd, env: { ...process.env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });

module.exports = { CLI_BIN, runCli };
