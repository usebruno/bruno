#!/usr/bin/env node
import path from 'node:path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

import { startStdioServer } from './transports/stdio.js';
import { isCollectionDir, isWorkspaceDir, discoverCollections } from './core/discover.js';
import type { DiscoveryConfig } from './types.js';

// argv is fully typed by inference from the .option() chain below — no hand-written
// interface to drift out of sync, no cast.
const argv = yargs(hideBin(process.argv))
  .scriptName('bruno-mcp')
  .usage('Usage: $0 [--collection <path>] [--workspace <path>] [--cwd-path <path>] [--no-cwd-discovery] [--no-auto-discovery]')
  .option('collection', {
    alias: 'c',
    type: 'array',
    describe: 'Path to a Bruno collection directory (contains bruno.json or opencollection.yml). Repeatable.',
    default: []
  })
  .option('workspace', {
    alias: 'w',
    type: 'array',
    describe: 'Path to a Bruno workspace directory (contains workspace.yml). Repeatable. Expands to all member collections.',
    default: []
  })
  .option('cwd-path', {
    type: 'string',
    describe: 'Override the CWD used for walk-up discovery (defaults to process.cwd()).'
  })
  .option('cwd-discovery', {
    type: 'boolean',
    describe: 'Walk up from the CWD looking for a Bruno collection or workspace. Pass --no-cwd-discovery to disable.',
    default: true
  })
  .option('auto-discovery', {
    type: 'boolean',
    describe:
      'Fall back on Bruno desktop preferences when nothing else is scoped (exposes every collection/workspace you last had open). On by default; pass --no-auto-discovery to disable and expose only what you explicitly scope.',
    default: true
  })
  .option('verbose', {
    type: 'boolean',
    describe: 'Log debug info to stderr',
    default: false
  })
  .help()
  .alias('h', 'help')
  .parseSync();

const log = (msg: string): void => {
  process.stderr.write(`[bruno-mcp] ${msg}\n`);
};

const explicitCollections = (argv.collection || []).map((p) => path.resolve(String(p)));
const explicitWorkspaces = (argv.workspace || []).map((p) => path.resolve(String(p)));

const invalidPaths: string[] = [];
for (const p of explicitCollections) {
  if (!isCollectionDir(p)) {
    invalidPaths.push(`--collection path is not a Bruno collection (no bruno.json or opencollection.yml): ${p}`);
  }
}
for (const p of explicitWorkspaces) {
  if (!isWorkspaceDir(p)) {
    invalidPaths.push(`--workspace path is not a Bruno workspace (no workspace.yml): ${p}`);
  }
}
if (invalidPaths.length > 0) {
  for (const msg of invalidPaths) process.stderr.write(`bruno-mcp: ${msg}\n`);
  process.exit(1);
}

const config: DiscoveryConfig = {
  explicitCollections,
  explicitWorkspaces,
  cwdPath: argv['cwd-path'] ? String(argv['cwd-path']) : null,
  cwdDiscovery: !!argv['cwd-discovery'],
  autoDiscovery: !!argv['auto-discovery']
};

const { collections, source, diagnostics } = discoverCollections(config);

if (argv.verbose) {
  for (const d of diagnostics) log(d);
  log(`resolved ${collections.length} collection${collections.length === 1 ? '' : 's'} from source: ${source ?? 'none'}`);
}

if (collections.length === 0) {
  log(
    'no collections registered. Pass --collection <path> / --workspace <path>, or launch from inside a Bruno project. Auto-discovery of Bruno desktop collections is on but found nothing (open a collection in the Bruno app, or pass --no-auto-discovery to silence this fallback).'
  );
}

startStdioServer({ config, verbose: argv.verbose, source }).catch((err) => {
  process.stderr.write(`bruno-mcp: fatal error: ${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
