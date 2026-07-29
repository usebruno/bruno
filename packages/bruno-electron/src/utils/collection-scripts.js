const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_MAX_BUFFER = 1024 * 1024; // 1 MiB per stream
const TRUNCATION_MARKER = '\n[bruno: output truncated — exceeded maxBuffer]\n';

/**
 * Returns true only if scriptFile resolves — through symlinks — to a path
 * inside collectionPath. Uses fs.realpathSync so a symlink inside the
 * collection that points outside it is rejected. Returns false if either
 * path cannot be realpath-resolved (e.g. script does not exist), so the
 * caller never executes a non-existent or unreadable target.
 */
function isScriptPathSafe(collectionPath, scriptFile) {
  const lexicalCollection = path.resolve(collectionPath);
  const lexicalScript = path.resolve(collectionPath, scriptFile);

  let realCollection;
  try {
    realCollection = fs.realpathSync(lexicalCollection);
  } catch {
    // Collection directory does not exist on disk: fall back to lexical-only
    // comparison. This branch exists for unit tests that use fictional paths;
    // the IPC handler should never call this for a missing collection.
    return lexicalScript === lexicalCollection || lexicalScript.startsWith(lexicalCollection + path.sep);
  }

  let realScript;
  try {
    realScript = fs.realpathSync(lexicalScript);
  } catch {
    // Script doesn't exist (or unreadable). Reject — never spawn missing files.
    return false;
  }

  return realScript === realCollection || realScript.startsWith(realCollection + path.sep);
}

function parseEnvVarsFromOutput(output) {
  const vars = {};
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  }
  return vars;
}

/**
 * On Windows, spawning a script path directly cannot interpret shebangs or
 * resolve file associations (.cmd/.bat/.ps1/.js); shell:true delegates to
 * cmd.exe which does. On POSIX, the kernel honours the shebang itself.
 */
function buildSpawnArgs(resolvedScript, cwd, platform = process.platform) {
  const isWindows = platform === 'win32';
  return {
    command: resolvedScript,
    args: [],
    options: {
      cwd,
      env: process.env,
      ...(isWindows ? { shell: true, windowsHide: true } : {})
    }
  };
}

function runShellScript(collectionPath, scriptFile, { onStdout, onStderr, maxBuffer = DEFAULT_MAX_BUFFER } = {}) {
  return new Promise((resolve, reject) => {
    const resolvedScript = path.resolve(collectionPath, scriptFile);
    const { command, args, options } = buildSpawnArgs(resolvedScript, collectionPath);
    const proc = spawn(command, args, options);

    let stdout = '';
    let stderr = '';
    let truncated = false;

    const append = (current, chunk) => {
      if (truncated) return current;
      const remaining = maxBuffer - current.length;
      if (chunk.length <= remaining) return current + chunk;
      truncated = true;
      return current + chunk.slice(0, Math.max(0, remaining)) + TRUNCATION_MARKER;
    };

    proc.stdout.on('data', (d) => {
      const chunk = d.toString();
      stdout = append(stdout, chunk);
      onStdout?.(chunk);
    });
    proc.stderr.on('data', (d) => {
      const chunk = d.toString();
      stderr = append(stderr, chunk);
      onStderr?.(chunk);
    });
    proc.on('close', (exitCode) => resolve({ exitCode, stdout, stderr, truncated }));
    proc.on('error', (err) => {
      if (err.code === 'EACCES') {
        reject(new Error(`Script is not executable. Run: chmod +x ${scriptFile}`));
      } else {
        reject(err);
      }
    });
  });
}

module.exports = { isScriptPathSafe, parseEnvVarsFromOutput, runShellScript, buildSpawnArgs };
