const { spawn, execFileSync } = require('child_process');
const net = require('net');
const path = require('path');
const { resolveDevPort } = require('./dev-port');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  label: (label, msg) => console.log(`${colors.bright}${colors.magenta}[${label}]${colors.reset} ${msg}`)
};

const rootDir = path.join(__dirname, '..');
const webDir = path.join(rootDir, 'packages/bruno-app');
const electronDir = path.join(rootDir, 'packages/bruno-electron');

// Cold Windows builds can take well over 30s. This only bounds a server that
// never binds; Electron starts as soon as the pinned port accepts connections.
const PORT_READY_TIMEOUT_MS = 180000;
const PORT_POLL_MS = 250;

let webProcess = null;
let electronProcess = null;
let shuttingDown = false;
let portPollTimer = null;
let activeSocket = null;

function portIsOpen(port) {
  return new Promise((resolve) => {
    if (shuttingDown) {
      resolve(false);
      return;
    }

    const socket = net.connect({ port, host: '127.0.0.1' });
    activeSocket = socket;
    let settled = false;
    const finish = (open) => {
      if (settled) {
        return;
      }
      settled = true;
      if (activeSocket === socket) {
        activeSocket = null;
      }
      socket.destroy();
      resolve(open);
    };

    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(500, () => finish(false));
  });
}

function waitForDevServer(port) {
  const started = Date.now();

  return new Promise((resolve) => {
    const poll = async () => {
      if (shuttingDown) {
        resolve(false);
        return;
      }

      const open = await portIsOpen(port);
      if (shuttingDown) {
        resolve(false);
        return;
      }
      if (open) {
        log.success(`Dev server is accepting connections on port ${colors.bright}${port}${colors.reset}`);
        resolve(true);
        return;
      }
      if (Date.now() - started >= PORT_READY_TIMEOUT_MS) {
        log.error(`Dev server did not open port ${port} within ${PORT_READY_TIMEOUT_MS / 1000}s`);
        cleanup(1);
        resolve(false);
        return;
      }

      portPollTimer = setTimeout(poll, PORT_POLL_MS);
    };

    poll();
  });
}

function startElectron(port) {
  if (electronProcess || shuttingDown) {
    return;
  }

  log.info(`Starting Electron with ${colors.cyan}BRUNO_DEV_PORT=${port}${colors.reset}`);

  electronProcess = spawn('npm', ['run', 'dev'], {
    cwd: electronDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      BRUNO_DEV_PORT: String(port)
    }
  });

  electronProcess.on('error', (err) => {
    if (shuttingDown) {
      return;
    }
    log.error(`Failed to start Electron: ${err.message}`);
    cleanup(1);
  });

  electronProcess.on('close', (code) => {
    if (shuttingDown) {
      return;
    }
    log.info(`Electron process exited with code ${code}`);
    cleanup(code ?? 0);
  });
}

// shell: true means child.kill() only stops the cmd.exe wrapper on Windows.
function killProcessTree(child) {
  if (!child || child.pid == null) {
    return;
  }

  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      // The process tree has already exited.
    }
    return;
  }

  if (!child.killed) {
    child.kill();
  }
}

function cleanup(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (portPollTimer) {
    clearTimeout(portPollTimer);
    portPollTimer = null;
  }
  if (activeSocket) {
    activeSocket.destroy();
    activeSocket = null;
  }

  killProcessTree(webProcess);
  killProcessTree(electronProcess);
  process.exit(exitCode);
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
process.on('SIGHUP', () => cleanup(0));

async function main() {
  let devPort;
  try {
    devPort = resolveDevPort();
  } catch (err) {
    log.error(err.message);
    process.exit(1);
  }

  console.log(`\n${colors.bright}${colors.yellow}🚀 Starting Bruno development environment...${colors.reset}\n`);

  if (await portIsOpen(devPort)) {
    log.error(`Port ${devPort} is already in use. Stop the other process or set BRUNO_DEV_PORT to a free port.`);
    process.exit(1);
  }

  log.info(`Starting dev server on port ${colors.bright}${devPort}${colors.reset}`);

  webProcess = spawn('npm', ['run', 'dev'], {
    cwd: webDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      BRUNO_DEV_PORT: String(devPort)
    }
  });

  webProcess.on('error', (err) => {
    if (shuttingDown) {
      return;
    }
    log.error(`Failed to start the dev server: ${err.message}`);
    cleanup(1);
  });

  webProcess.on('close', (code) => {
    if (shuttingDown) {
      return;
    }
    log.info(`Web process exited with code ${code}`);
    cleanup(code ?? 0);
  });

  const ready = await waitForDevServer(devPort);
  if (ready) {
    startElectron(devPort);
  }
}

main().catch((err) => {
  log.error(err.message);
  cleanup(1);
});
