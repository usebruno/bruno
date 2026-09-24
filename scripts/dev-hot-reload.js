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

const { execSync, spawn } = require('child_process');
const { readFileSync, readdirSync } = require('fs');
const path = require('path');

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

class ProcessManager {
  constructor() {
    this._procs = [];
    this._shuttingDown = false;
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      process.on(sig, () => this.shutdown(sig));
    }
  }

  register(proc, name) {
    this._procs.push({ proc, name });
    proc.on('close', code => {
      if (!this._shuttingDown && code !== null && code !== 0) {
        log(LOG_LEVELS.ERROR, `Process "${name}" exited unexpectedly (code ${code}), shutting down...`);
        this.shutdown('child-exit');
      }
    });
    return proc;
  }

  shutdown(signal) {
    if (this._shuttingDown) return;
    this._shuttingDown = true;
    log(LOG_LEVELS.INFO, `Received ${signal}, shutting down all processes...`);
    for (const { proc } of this._procs) {
      try { proc.kill(); } catch { /* already dead */ }
    }
    setTimeout(() => {
      log(LOG_LEVELS.WARN, 'Force-exiting after timeout...');
      process.exit(0);
    }, 5000).unref();
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

// Packages that have a build script but are launched separately
// and must not enter the watcher startup pipeline.
const DEV_EXCLUDED_PACKAGES = new Set(['@usebruno/app']); // launched via dev:web

/**
 * Read every packages/* directory and return a descriptor for each
 * @usebruno/* package that has at least a `build` npm script.
 *
 * @param {string} rootDir - absolute path to repo root
 * @returns {{ name: string, dir: string, hasWatch: boolean, internalDeps: string[] }[]}
 */
function discoverPackages(rootDir) {
  const pkgsDir = path.join(rootDir, 'packages');
  const results = [];

  for (const folder of readdirSync(pkgsDir)) {
    const pjsonPath = path.join(pkgsDir, folder, 'package.json');
    let raw;
    try {
      raw = JSON.parse(readFileSync(pjsonPath, 'utf8'));
    } catch {
      continue;
    }

    const name = raw.name || '';
    if (!name.startsWith('@usebruno/')) continue;
    if (DEV_EXCLUDED_PACKAGES.has(name)) continue;

    const scripts = raw.scripts || {};
    if (!('build' in scripts)) continue;

    const allDeps = { ...raw.dependencies, ...raw.devDependencies };
    const internalDeps = Object.keys(allDeps).filter(k => k.startsWith('@usebruno/'));

    results.push({ name, dir: path.join(pkgsDir, folder), hasWatch: 'watch' in scripts, internalDeps });
  }

  return results;
}

/**
 * Topologically sort packages into dependency stages using Kahn's algorithm.
 * Deps that are not in the buildable set (no build script) are ignored.
 * Throws if a cycle is detected.
 *
 * @param {{ name: string, internalDeps: string[] }[]} packages
 * @returns {typeof packages[]}[]  array of stages; packages within a stage are independent
 */
function topoSort(packages) {
  const byName = new Map(packages.map(p => [p.name, p]));
  const inDegree = new Map(packages.map(p => [p.name, 0]));
  const adj = new Map(packages.map(p => [p.name, []]));

  for (const pkg of packages) {
    for (const dep of pkg.internalDeps) {
      if (!byName.has(dep)) continue; // dep has no build script — skip
      adj.get(dep).push(pkg.name);
      inDegree.set(pkg.name, inDegree.get(pkg.name) + 1);
    }
  }

  const stages = [];
  let frontier = packages.filter(p => inDegree.get(p.name) === 0).map(p => p.name);

  while (frontier.length > 0) {
    stages.push(frontier.map(n => byName.get(n)));
    const next = [];
    for (const n of frontier) {
      for (const neighbour of adj.get(n)) {
        inDegree.set(neighbour, inDegree.get(neighbour) - 1);
        if (inDegree.get(neighbour) === 0) next.push(neighbour);
      }
    }
    frontier = next;
  }

  if (stages.reduce((acc, s) => acc + s.length, 0) !== packages.length) {
    throw new Error('Cycle detected in @usebruno/* dependency graph');
  }

  return stages;
}

/**
 * Discover all buildable @usebruno/* packages and return them as topo-sorted stages.
 *
 * @param {string} rootDir
 * @returns {ReturnType<typeof topoSort>}
 */
function buildDevPackageGraph(rootDir) {
  const packages = discoverPackages(rootDir);
  log(LOG_LEVELS.DEBUG, `Discovered ${packages.length} buildable @usebruno/* packages`);
  const stages = topoSort(packages);
  stages.forEach((s, i) =>
    log(LOG_LEVELS.DEBUG, `Stage ${i + 1}: ${s.map(p => p.name).join(', ')}`)
  );
  return stages;
}

// Color palette for auto-assigning colors to discovered package watchers
const WATCHER_COLORS = [
  '\x1b[35m', // magenta
  '\x1b[32m', // green
  '\x1b[34m', // blue
  '\x1b[37m', // white
  '\x1b[90m', // gray
  '\x1b[91m', // salmon
  '\x1b[33m', // yellow
  '\x1b[36m', // cyan
];
let _watcherColorIndex = 0;
function nextWatcherColor() {
  return WATCHER_COLORS[_watcherColorIndex++ % WATCHER_COLORS.length];
}

// Spawn a process and prefix every line of its output with [name]
function spawnWithPrefix(cmd, args, name, color) {
  const prefix = `${color}[${name}]${COLORS.nc} `;
  const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stdout.on('data', data =>
    data.toString().split('\n').filter(Boolean).forEach(line =>
      process.stdout.write(prefix + line + '\n')
    )
  );
  proc.stderr.on('data', data =>
    data.toString().split('\n').filter(Boolean).forEach(line =>
      process.stderr.write(prefix + line + '\n')
    )
  );

  return proc;
}

/**
 * Start or build all packages in a single topo-sort stage, then resolve.
 * - Packages with a `watch` script: spawned as long-lived watchers; waits
 *   for rollup's "created " signal before resolving.
 * - Packages without a `watch` script (e.g. bruno-schema-types): one-time
 *   build only; not registered with ProcessManager (they exit by design).
 *
 * All packages in the stage are started concurrently.
 *
 * @param {{ name: string, dir: string, hasWatch: boolean }[]} stage
 * @param {ProcessManager} procManager
 * @param {number} stageIndex
 */
async function startWatcherStage(stage, procManager, stageIndex) {
  log(LOG_LEVELS.INFO, `Stage ${stageIndex + 1}: ${stage.map(p => p.name).join(', ')}`);

  const tasks = stage.map(pkg => {
    const shortName = pkg.name.replace('@usebruno/', '');
    const workspaceFlag = `--workspace=${pkg.dir}`;

    if (pkg.hasWatch) {
      const proc = procManager.register(
        spawnWithPrefix('npm', ['run', 'watch', workspaceFlag], shortName, nextWatcherColor()),
        shortName
      );
      return new Promise(resolve => {
        const onData = data => {
          if (data.toString().includes('created ')) {
            proc.stdout.off('data', onData);
            proc.stderr.off('data', onData);
            log(LOG_LEVELS.SUCCESS, `${shortName} — initial watch build done`);
            resolve();
          }
        };
        proc.stdout.on('data', onData);
        proc.stderr.on('data', onData);
      });
    } else {
      // One-time build — not registered with ProcessManager
      log(LOG_LEVELS.INFO, `${shortName} — running one-time build (no watch script)`);
      return new Promise((resolve, reject) => {
        const proc = spawn('npm', ['run', 'build', workspaceFlag], { stdio: 'inherit' });
        proc.on('close', code => {
          if (code === 0) {
            log(LOG_LEVELS.SUCCESS, `${shortName} — build done`);
            resolve();
          } else {
            reject(new Error(`Build failed for ${shortName} (exit ${code})`));
          }
        });
        proc.on('error', reject);
      });
    }
  });

  await Promise.all(tasks);
  log(LOG_LEVELS.SUCCESS, `Stage ${stageIndex + 1} complete`);
}

// Setup development environment
async function startDevelopment() {
  const rootDir = path.join(__dirname, '..');
  const procManager = new ProcessManager();

  const stages = buildDevPackageGraph(rootDir);
  for (let i = 0; i < stages.length; i++) {
    await startWatcherStage(stages[i], procManager, i);
  }

  log(LOG_LEVELS.SUCCESS, 'All watchers ready — starting React + Electron...');

  procManager.register(
    spawnWithPrefix('npm', ['run', 'dev:web'], 'react', '\x1b[36m'),
    'react'
  );

  // Build nodemon args without a shell wrapper so signals propagate correctly
  const nodemonArgs = [
    ...CONFIG.ELECTRON_WATCH_PATHS.flatMap(p => ['--watch', p]),
    '--ext', 'js,jsx,ts,tsx',
    '--delay', `${CONFIG.NODEMON_WATCH_DELAY}ms`,
    '--exec', 'npm run dev --workspace=packages/bruno-electron'
  ];
  procManager.register(
    spawnWithPrefix('nodemon', nodemonArgs, 'electron', '\x1b[33m'),
    'electron'
  );
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