const { execSync } = require('node:child_process');
const os = require('node:os');

function execCommand(command, cwd = process.cwd()) {
  return execSync(command, {
    cwd,
    stdio: 'inherit',
    timeout: 30000
  });
}

function execCommandSilent(command, cwd = process.cwd()) {
  return execSync(command, {
    cwd,
    stdio: 'pipe',
    timeout: 30000
  });
}

function detectPlatform() {
  const platform = os.platform();
  switch (platform) {
    case 'darwin': return 'macos';
    case 'linux': return 'linux';
    case 'win32': return 'windows';
    default: throw new Error(`Unsupported platform: ${platform}`);
  }
}

// netstat -ano rows are: Proto | Local Address | Foreign Address | State | PID.
// Matching the *local* address is what keeps us from killing an unrelated process that
// merely holds an outbound connection to a remote :${port} — that port lands in the
// Foreign Address column. The State column is deliberately not matched: netstat
// localizes it (ABHÖREN, À L'ÉCOUTE), so comparing against 'LISTENING' would silently
// match nothing on a non-English Windows. TIME_WAIT rows are owned by no process and
// report PID 0, hence the PID guard.
function portOwnerPidsFromNetstat(netstatOutput, port) {
  const pids = new Set();
  for (const line of netstatOutput.split('\n')) {
    const [proto, localAddress, , , pid] = line.trim().split(/\s+/);
    if (proto !== 'TCP' || !localAddress || !localAddress.endsWith(`:${port}`)) continue;
    if (!/^\d+$/.test(pid) || pid === '0') continue;
    pids.add(pid);
  }
  return pids;
}

function hasListenerOnPort(port) {
  try {
    if (detectPlatform() === 'windows') {
      const netstatOutput = execCommandSilent(`netstat -ano | findstr :${port}`).toString();
      return portOwnerPidsFromNetstat(netstatOutput, port).size > 0;
    }
    return execCommandSilent(`lsof -ti :${port} -sTCP:LISTEN`).toString().trim().length > 0;
  } catch {
    // no match — lsof and findstr both exit non-zero when they find nothing
    return false;
  }
}

// kill/taskkill only asks the kernel to terminate the process; the port stays bound for a
// short moment after the command returns, so binding immediately can still hit EADDRINUSE.
// Each poll spawns a subprocess, which is itself the delay between attempts.
function waitForPortRelease(port, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!hasListenerOnPort(port)) return;
  }
  throw new Error(`Port ${port} is still bound after ${timeoutMs}ms; the process holding it could not be killed`);
}

function killProcessOnPort(port) {
  const platform = detectPlatform();

  try {
    switch (platform) {
      case 'macos':
      case 'linux':
        execCommand(`lsof -ti :${port} -sTCP:LISTEN | xargs -r kill -9`);
        break;
      case 'windows': {
        const netstatOutput = execCommandSilent(`netstat -ano | findstr :${port}`).toString();
        for (const pid of portOwnerPidsFromNetstat(netstatOutput, port)) {
          // a PID that already exited makes taskkill exit non-zero; the remaining PIDs
          // still need killing, so failures can't be allowed to break out of the loop
          try { execCommandSilent(`taskkill /F /PID ${pid}`); } catch {}
        }
        break;
      }
    }
  } catch (error) {}

  waitForPortRelease(port);
}

module.exports = {
  execCommand,
  execCommandSilent,
  detectPlatform,
  killProcessOnPort
};
