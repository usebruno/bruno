#!/usr/bin/env node

/**
# Bruno Development Script
#
# This script sets up and runs the Bruno development environment with hot-reloading.
# It manages concurrent processes for various packages and provides cleanup on exit.
#
# Usage:
#   From the root of the project, run:
#       node ./scripts/dev-hot-reload.js [options]
#   or
#       npm run dev:watch -- [options]
*/

const { execSync } = require('child_process');
const { readFileSync } = require('fs');

// Get major version from .nvmrc (e.g. v22.1.0  -> v22)
const NODE_VERSION = readFileSync('.nvmrc', 'utf8').trim().split('.')[0];

// Configuration
const CONFIG = {
  NODE_VERSION,
  ELECTRON_WATCH_PATHS: [
    'packages/**/dist/',
    'packages/bruno-electron/src/',
    'packages/bruno-lang/src/',
    'packages/bruno-lang/v2/src/',
    'packages/bruno-js/src/',
    'packages/bruno-schema/src/'
  ],
  ELECTRON_START_DELAY: 10, // seconds
  NODEMON_WATCH_DELAY: 1000 // milliseconds
};

const COLORS = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  nc: '\x1b[0m' // No Color
};

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
  SUCCESS: 'SUCCESS'
};

function log(level, msg) {
  let color = COLORS.nc;
  switch (level) {
    case LOG_LEVELS.INFO:
    case LOG_LEVELS.SUCCESS:  color = COLORS.green; break;
    case LOG_LEVELS.WARN:     color = COLORS.yellow; break;
    case LOG_LEVELS.ERROR:    color = COLORS.red; break;
    case LOG_LEVELS.DEBUG:    color = COLORS.blue; break;
  }

  const output = `${color}[${level}]${COLORS.nc} ${msg}`;
  if (level === LOG_LEVELS.ERROR) {
    console.error(output);
  } else {
    console.log(output);
  }
}

// Show help documentation
function showHelp() {
  console.log(`
  Development Environment Setup for Bruno

  Usage:
      From the root of the project, run:
          npm run dev:watch -- [options]
      or
          node scripts/dev-hot-reload.js [options]

  Options:
      -s, --setup    Clean all node_modules folders and re-install dependencies before starting
      -h, --help     Show this help message

  Examples:
      # Start development environment
      npm run dev:watch

      # Start after cleaning node_modules
      npm run dev:watch -- --setup

      # Show this help
      npm run dev:watch -- --help
`);
}

function commandExists(command) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Install global NPM package if not present
function ensureGlobalPackage(packageName) {
  if (!commandExists(packageName)) {
    log(LOG_LEVELS.INFO, `Installing ${packageName} globally...`);
    execSync(`npm install -g ${packageName}`, { stdio: 'inherit' });
  }
}

// Ensure correct node version
function ensureNodeVersion(requiredVersion) {
  const currentVersion = process.version;
  if (!currentVersion.includes(requiredVersion)) {
    log(LOG_LEVELS.ERROR, `Node ${requiredVersion} is required but currently installed version is ${currentVersion}`);
    log(LOG_LEVELS.ERROR, `Please install node ${requiredVersion} and try again.`);
    log(LOG_LEVELS.ERROR, `You can run 'nvm install ${requiredVersion}' to install it, or 'nvm use ${requiredVersion}' if it's already installed.`);

    process.exit(1);
  }
}

function cleanNodeModules() {
  log(LOG_LEVELS.INFO, 'Removing all node_modules directories...');
  execSync('find . -name "node_modules" -type d -prune -exec rm -rf {} +', { stdio: 'inherit' });
  log(LOG_LEVELS.SUCCESS, 'Node modules cleanup completed');
}

function reinstallDependencies() {
  log(LOG_LEVELS.INFO, 'Re-installing dependencies...');
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  log(LOG_LEVELS.SUCCESS, 'Dependencies re-installation completed');
}

// Setup development environment
function startDevelopment() {
  log(LOG_LEVELS.INFO, 'Starting development servers...');

  const concurrently = require('concurrently');
  const watchPaths = CONFIG.ELECTRON_WATCH_PATHS.map(path => `--watch "${path}"`).join(' ');

  // concurrently command objects: { command, name, prefixColor, env, cwd, ipc }
  const commandObjects = [
    {
      command: 'npm run watch --workspace=packages/bruno-common',
      name: 'common',
      prefixColor: 'magenta'
    },
    {
      command: 'npm run watch --workspace=packages/bruno-converters',
      name: 'converters',
      prefixColor: 'green'
    },
    {
      command: 'npm run watch --workspace=packages/bruno-query',
      name: 'query',
      prefixColor: 'blue'
    },
    {
      command: 'npm run watch --workspace=packages/bruno-graphql-docs',
      name: 'graphql',
      prefixColor: 'white'
    },
    {
      command: 'npm run watch --workspace=packages/bruno-requests',
      name: 'requests',
      prefixColor: 'gray'
    },
    {
      command: 'npm run watch --workspace=packages/bruno-filestore',
      name: 'filestore',
      prefixColor: '#FA8072'
    },
    {
      command: 'npm run dev:web',
      name: 'react',
      prefixColor: 'cyan'
    },
    {
      command: `sleep ${CONFIG.ELECTRON_START_DELAY} && nodemon ${watchPaths} --ext js,jsx,ts,tsx --delay ${CONFIG.NODEMON_WATCH_DELAY}ms --exec "npm run dev --workspace=packages/bruno-electron"`,
      name: 'electron',
      prefixColor: 'yellow',
      delay: CONFIG.ELECTRON_START_DELAY
    }
  ];

  const { result } = concurrently(commandObjects, {
    prefix: '[{name}: {pid}]',
    killOthers: ['failure', 'success'],
    restartTries: 3,
    restartDelay: 1000
  });

  result
    .then(() => log(LOG_LEVELS.SUCCESS, 'All processes completed successfully'))
    .catch(err => {
      log(LOG_LEVELS.ERROR, 'Development environment failed to start');
      console.error(err);
      process.exit(1);
    });
}

// Main function
(async function main() {
  const args = process.argv.slice(2);
  let runSetup = false;

  // Parse command line arguments
  for (const arg of args) {
    if (arg === '-s' || arg === '--setup') {
      runSetup = true;
    } else if (arg === '-h' || arg === '--help') {
      showHelp();
      process.exit(0);
    } else {
      log(LOG_LEVELS.ERROR, `Unknown parameter: ${arg}`);
      showHelp();
      process.exit(1);
    }
  }

  log(LOG_LEVELS.INFO, 'Initializing Bruno development environment...');

  // Ensure required global packages and node version
  ensureNodeVersion(CONFIG.NODE_VERSION);
  ensureGlobalPackage('nodemon');
  ensureGlobalPackage('concurrently');

  // Run setup if requested
  if (runSetup) {
    cleanNodeModules();
    reinstallDependencies();
  }

  // Start development environment
  startDevelopment();
})().catch(err => {
  log(LOG_LEVELS.ERROR, 'An error occurred:');
  console.error(err);
  process.exit(1);
});