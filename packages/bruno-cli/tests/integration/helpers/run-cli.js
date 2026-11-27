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

/**
 * Runs the CLI against a collection under the developer sandbox and without a proxy, and throws on a
 * non-zero exit so a broken run cannot read as a pass.
 *
 * @param {string} collectionDir - Directory to run from
 * @param {string[]} args - CLI arguments, starting with the command
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
const runCollection = async (collectionDir, args) => {
  const result = await runCli([...args, '--sandbox', 'developer', '--noproxy'], collectionDir);

  if (result.code !== 0) {
    throw new Error(
      `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
    );
  }

  return result;
};

module.exports = { CLI_BIN, runCli, runCollection };
