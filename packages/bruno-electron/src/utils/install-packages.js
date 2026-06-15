const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const NPM_NAME_REGEX = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;

const shouldUseShellForNpmSpawn = (npmCommand, platform = process.platform) => {
  return platform === 'win32' && /\.(cmd|bat)$/i.test(npmCommand);
};

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // npm installs can legitimately take minutes
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024; // bound captured stdout/stderr
const NODE_SHIM_ENV_KEYS = ['NVM_BIN', 'FNM_MULTISHELL_PATH'];
const NPM_NOT_FOUND_MESSAGE = 'npm was not found on your PATH. Install Node.js/npm, then try again or run the command manually.';

let cachedNpmInvocation = null;

const isValidNpmPackageName = (name) => typeof name === 'string' && NPM_NAME_REGEX.test(name);

// Keep only the trailing `cap` bytes - npm surfaces the actionable error at the
// end of its output, so the tail is what we want to show the user.
const appendCapped = (buffer, chunk, cap) => {
  const next = buffer + chunk;
  return next.length > cap ? next.slice(next.length - cap) : next;
};

const resolveNodeExecutable = () => {
  const nodeName = process.platform === 'win32' ? 'node.exe' : 'node';

  for (const key of NODE_SHIM_ENV_KEYS) {
    const dir = process.env[key];
    if (!dir) continue;
    const candidate = path.join(dir, nodeName);
    if (fs.existsSync(candidate)) return candidate;
  }

  for (const dir of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(dir, nodeName);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
};

const resolveNpmCli = (nodePath) => {
  const nodeDir = path.dirname(nodePath);
  const candidates = [
    path.join(nodeDir, 'npm'),
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const resolveNpmInvocation = () => {
  if (cachedNpmInvocation) return cachedNpmInvocation;

  const nodePath = resolveNodeExecutable();
  if (!nodePath) return null;

  const npmCliPath = resolveNpmCli(nodePath);
  if (!npmCliPath) return null;

  cachedNpmInvocation = { nodePath, npmCliPath };
  return cachedNpmInvocation;
};

const clearNpmInvocationCache = () => {
  cachedNpmInvocation = null;
};

const buildSafeEnv = (nodeBinDir) => {
  const existingPath = process.env.PATH || '';
  const newPath = [nodeBinDir, existingPath].filter(Boolean).join(path.delimiter);
  return { ...process.env, PATH: newPath };
};

// CVE-2024-27980: Node.js rejects spawn/spawnSync of .cmd/.bat with shell:false on
// Windows (EINVAL). npm.cmd is affected; node.exe + npm-cli.js is not.
const isWindowsBatchFile = (filePath) => {
  if (process.platform !== 'win32') return false;
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.cmd' || ext === '.bat';
};

const buildSpawnOptions = ({ nodePath, collectionPath }) => ({
  cwd: collectionPath,
  env: buildSafeEnv(path.dirname(nodePath)),
  shell: isWindowsBatchFile(nodePath),
  windowsHide: true
});

/**
 * Runs `npm install --save <packages>` in a collection directory and resolves
 * with a structured result. Never rejects - runtime failures (non-zero exit,
 * npm-not-found, timeout) come back as `{ success: false, ... }` so callers
 * can surface a useful message.
 *
 * npm is invoked as `node <npm-cli.js> install --save ...` — not npm.cmd — so
 * shell:false is safe on Windows (CVE-2024-27980 only blocks .cmd/.bat without shell).
 *
 * `spawnFn`, `timeoutMs`, and `resolveNpmInvocationFn` are injectable for testing.
 *
 * @returns {Promise<{ success: boolean, exitCode: number, stdout: string,
 *   stderr: string, installed: string[], errorCode?: string }>}
 */
const runNpmInstall = ({
  collectionPath,
  packages,
  spawnFn = spawn,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  resolveNpmInvocationFn = resolveNpmInvocation
}) => {
  const installed = Array.from(new Set(packages));
  const npmArgs = ['install', '--save', ...installed];

  const invocation = resolveNpmInvocationFn();
  if (!invocation) {
    return Promise.resolve({
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: NPM_NOT_FOUND_MESSAGE,
      installed,
      errorCode: 'NPM_NOT_FOUND'
    });
  }

  const { nodePath, npmCliPath } = invocation;
  const spawnArgs = [npmCliPath, ...npmArgs];
  const spawnOptions = buildSpawnOptions({ nodePath, collectionPath });

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({ stdout, stderr, installed, ...result });
    };

    let child;
    try {
      child = spawnFn(nodePath, spawnArgs, spawnOptions);
    } catch (err) {
      finish({ success: false, exitCode: -1, stderr: err.message, errorCode: 'SPAWN_FAILED' });
      return;
    }

    timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // ignore - process may have already exited
      }
      finish({
        success: false,
        exitCode: -1,
        errorCode: 'TIMEOUT',
        stderr: `${stderr}\nnpm install timed out after ${Math.round(timeoutMs / 1000)}s.`
      });
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout = appendCapped(stdout, chunk.toString(), maxOutputBytes);
    });
    child.stderr?.on('data', (chunk) => {
      stderr = appendCapped(stderr, chunk.toString(), maxOutputBytes);
    });

    child.on('error', (err) => {
      const isMissingNpm = err.code === 'ENOENT';
      finish({
        success: false,
        exitCode: -1,
        errorCode: isMissingNpm ? 'NPM_NOT_FOUND' : 'SPAWN_ERROR',
        stderr: isMissingNpm ? NPM_NOT_FOUND_MESSAGE : `${stderr}\n${err.message}`
      });
    });

    child.on('close', (code) => {
      finish({ success: code === 0, exitCode: code });
    });
  });
};

module.exports = {
  isValidNpmPackageName,
  shouldUseShellForNpmSpawn,
  runNpmInstall,
  resolveNodeExecutable,
  resolveNpmCli,
  resolveNpmInvocation,
  clearNpmInvocationCache,
  buildSafeEnv,
  buildSpawnOptions,
  isWindowsBatchFile,
  NPM_NAME_REGEX,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_OUTPUT_BYTES,
  NPM_NOT_FOUND_MESSAGE
};
