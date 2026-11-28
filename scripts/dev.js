const { spawn, execFileSync } = require('child_process');
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
const outputBuffers = { stdout: '', stderr: '' };

// Regex to match rsbuild's local URL output (e.g., "➜ Local:    http://localhost:3000/").
// The trailing slash ensures a port split across chunks is only read once complete.
const portRegex = /Local:\s+http:\/\/localhost:(\d+)\//;

// rsbuild colours its output even when piped on Windows (picocolors always enables
// colour on win32), which puts escape codes between "Local:" and the URL.
const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, '');

console.log(`\n${colors.bright}${colors.yellow}🚀 Starting Bruno development environment...${colors.reset}\n`);

// Start the rsbuild dev server
const webProcess = spawn('npm', ['run', 'dev'], {
  cwd: webDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

// rsbuild may print its startup banner on either stream, so both are scanned
function detectPort(stream, output) {
  if (detectedPort) {
    return;
  }

  // Raw chunks are joined before stripping so an escape code or banner line split
  // across chunks is matched as a whole. Each stream keeps its own buffer so the
  // two never interleave mid-line.
  const buffer = outputBuffers[stream] + output;
  const match = stripAnsi(buffer).match(portRegex);
  if (match) {
    detectedPort = match[1];
    log.success(`Detected dev server on port ${colors.bright}${detectedPort}${colors.reset}`);
    startElectron(detectedPort);
    return;
  }

  outputBuffers[stream] = buffer.slice(-1000);
}

webProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  detectPort('stdout', output);
});

webProcess.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  detectPort('stderr', output);
});

webProcess.on('close', (code) => {
  log.info(`Web process exited with code ${code}`);
  cleanup();
});

function startElectron(port) {
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

function killProcess(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  // With shell: true, child.kill() on Windows only stops the cmd.exe wrapper and
  // leaves rsbuild / Electron running, so kill the whole process tree instead.
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      // Process tree already exited
    }
    return;
  }

  child.kill();
}

function cleanup() {
  killProcess(webProcess);
  killProcess(electronProcess);
  process.exit(0);
}

// Handle termination signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGHUP', cleanup);
