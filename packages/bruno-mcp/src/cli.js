const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const { startStdioServer } = require('./server');
const {
  isCollectionDir,
  isWorkspaceDir,
  collectionsFromWorkspace,
  autoDiscoverFromBruno,
  discoverFromCwd
} = require('./discover');

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
    describe: 'Fall back to Bruno desktop preferences when nothing else is found. Pass --no-auto-discovery to disable.',
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

const log = (msg) => process.stderr.write(`[bruno-mcp] ${msg}\n`);

const explicitCollections = (argv.collection || []).map((p) => path.resolve(String(p)));
const explicitWorkspaces = (argv.workspace || []).map((p) => path.resolve(String(p)));

for (const p of explicitCollections) {
  if (!isCollectionDir(p)) {
    process.stderr.write(`bruno-mcp: --collection path is not a Bruno collection (no bruno.json or opencollection.yml): ${p}\n`);
    process.exit(1);
  }
}
for (const p of explicitWorkspaces) {
  if (!isWorkspaceDir(p)) {
    process.stderr.write(`bruno-mcp: --workspace path is not a Bruno workspace (no workspace.yml): ${p}\n`);
    process.exit(1);
  }
}

const dedupe = (entries) => {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const key = path.resolve(entry.path);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...entry, path: key });
  }
  return out;
};

// Priority chain (Option B):
//   1. Explicit --collection / --workspace
//   2. CWD walk-up discovery
//   3. Auto-discovery from Bruno desktop preferences
let entries = [];
let source = 'none';

if (explicitCollections.length > 0 || explicitWorkspaces.length > 0) {
  const fromExplicit = [];
  for (const c of explicitCollections) {
    fromExplicit.push({ path: c, workspacePath: null, workspaceName: null, nameInWorkspace: null });
  }
  for (const w of explicitWorkspaces) {
    const members = collectionsFromWorkspace(w);
    for (const m of members) fromExplicit.push(m);
    if (argv.verbose) log(`workspace ${w}: ${members.length} collections`);
  }
  entries = dedupe(fromExplicit);
  source = 'explicit';
} else if (argv['cwd-discovery']) {
  const cwd = argv['cwd-path'] ? path.resolve(String(argv['cwd-path'])) : process.cwd();
  const { entries: cwdEntries, hit } = discoverFromCwd(cwd);
  if (cwdEntries.length > 0) {
    entries = dedupe(cwdEntries);
    source = `cwd (${hit.marker} at ${hit.dir})`;
  } else if (argv.verbose) {
    log(`cwd discovery: no Bruno marker (workspace.yml/bruno.json/opencollection.yml) found walking up from ${cwd}`);
  }
}

if (entries.length === 0 && argv['auto-discovery']) {
  const { entries: discovered, diagnostics } = autoDiscoverFromBruno();
  if (discovered.length > 0) {
    entries = dedupe(discovered);
    source = `bruno-prefs (${diagnostics.prefsPath})`;
  } else if (argv.verbose) {
    log(
      diagnostics.prefsExists
        ? `auto-discovery: preferences.json had no resolvable collections (workspaces=${diagnostics.persistedWorkspaceCount}, collections=${diagnostics.persistedCollectionCount})`
        : `auto-discovery: preferences.json not found at ${diagnostics.prefsPath}`
    );
  }
}

if (argv.verbose) {
  log(`resolved ${entries.length} collection${entries.length === 1 ? '' : 's'} from source: ${source}`);
}

if (entries.length === 0) {
  log('no collections registered. Pass --collection <path>, --workspace <path>, run from inside a Bruno project, or open a collection in Bruno desktop.');
}

startStdioServer({ entries, verbose: argv.verbose, source }).catch((err) => {
  process.stderr.write(`bruno-mcp: fatal error: ${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
