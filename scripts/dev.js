const { spawn } = require('child_process');
const path = require('path');

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

let electronProcess = null;
let detectedPort = null;
let electronStarted = false;
let fallbackTimer = null;

// rsbuild's default dev server port; used as a fallback if the port line is never parsed
const DEFAULT_DEV_PORT = process.env.BRUNO_DEV_PORT || '3000';

// How long to wait for the port line before launching Electron on the default port
const PORT_DETECT_TIMEOUT_MS = 30000;

// Accumulate stdout so the port line is matched even when it arrives split across chunks
let outputBuffer = '';

// Strip ANSI color/escape codes so the regex isn't broken by colorized output (common on Windows)
const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, '');

// Regex to match rsbuild's local URL output (e.g., "➜ Local:    http://localhost:3000/")
// Tolerant of extra characters between "Local:" and the URL on the same line.
const portRegex = /Local:[^\n]*?localhost:(\d+)/;

console.log(`\n${colors.bright}${colors.yellow}🚀 Starting Bruno development environment...${colors.reset}\n`);

// Start the rsbuild dev server
const webProcess = spawn('npm', ['run', 'dev'], {
  cwd: webDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

// Safety net: if the port line is never detected (e.g. unexpected output formatting),
// launch Electron on the default port so the single `npm run dev` flow still works.
fallbackTimer = setTimeout(() => {
  if (!electronStarted) {
    log.warn(`Could not detect dev server port from output; falling back to port ${colors.bright}${DEFAULT_DEV_PORT}${colors.reset}`);
    startElectron(DEFAULT_DEV_PORT);
  }
}, PORT_DETECT_TIMEOUT_MS);

webProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  // Try to detect the port from rsbuild output
  if (!detectedPort) {
    // Match against the accumulated, ANSI-stripped output so a split or
    // colorized "Local: http://localhost:PORT" line is still detected (Windows).
    outputBuffer += stripAnsi(output);
    const match = outputBuffer.match(portRegex);
    if (match) {
      detectedPort = match[1];
      outputBuffer = '';
      log.success(`Detected dev server on port ${colors.bright}${detectedPort}${colors.reset}`);
      startElectron(detectedPort);
    }
  }
});

webProcess.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

webProcess.on('close', (code) => {
  log.info(`Web process exited with code ${code}`);
  cleanup();
});

function startElectron(port) {
  // Guard against launching Electron twice (port detection + fallback timer racing)
  if (electronStarted) {
    return;
  }
  electronStarted = true;
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }

  log.info(`Starting Electron with ${colors.cyan}BRUNO_DEV_PORT=${port}${colors.reset}`);

  electronProcess = spawn('npm', ['run', 'dev'], {
    cwd: electronDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      BRUNO_DEV_PORT: port
    }
  });

  electronProcess.on('close', (code) => {
    log.info(`Electron process exited with code ${code}`);
    cleanup();
  });
}

function cleanup() {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
  if (webProcess && !webProcess.killed) {
    webProcess.kill();
  }
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  process.exit(0);
}

// Handle termination signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
