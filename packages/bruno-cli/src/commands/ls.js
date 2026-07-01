const fs = require('fs');
const path = require('path');
const { createCollectionJsonFromPathname } = require('../utils/collection');
const { addJsonOptions, buildWriterFromArgv, emitResult } = require('../json/argv');
const { CliError } = require('../json/cli-error');
const { EXIT_STATUS } = require('../constants');

const command = 'ls [collection-path]';
const desc = 'List the requests, folders, and environments in a Bruno collection';

const REQUEST_TYPES = new Set(['http-request', 'graphql-request', 'grpc-request', 'ws-request']);

const builder = (yargs) => {
  yargs
    .positional('collection-path', {
      type: 'string',
      describe: 'Collection root directory (default: current working directory)'
    })
    .option('depth', {
      type: 'number',
      description: 'Limit recursion depth (root folders are depth 1)'
    });
  addJsonOptions(yargs)
    .example('$0 ls --json', 'List all items in the current collection as JSON')
    .example('$0 ls --depth 1 --json', 'Only list top-level items');
};

// Walk the collection JSON tree (output of createCollectionJsonFromPathname) and
// return a flat array of items. Each entry carries its relative path, type, and
// type-specific metadata (method/url for requests, etc.).
const walkItems = (items, collectionPath, currentDepth, maxDepth) => {
  const out = [];
  for (const item of items || []) {
    if (maxDepth != null && currentDepth > maxDepth) continue;

    const relPath = item.pathname
      ? path.relative(collectionPath, item.pathname)
      : null;
    const isRequest = REQUEST_TYPES.has(item.type);
    const isFolder = !isRequest && (item.items !== undefined || item.type === 'folder');

    const entry = {
      type: isRequest ? 'request' : (isFolder ? 'folder' : (item.type || 'unknown')),
      path: relPath,
      name: item.name || null,
      depth: currentDepth
    };

    if (isRequest && item.request) {
      entry.method = item.request.method || null;
      entry.url = item.request.url || null;
      entry.tags = item.tags || [];
      entry.has_tests = Boolean(item.request.tests && item.request.tests.trim());
      entry.has_assertions = Array.isArray(item.request.assertions)
        && item.request.assertions.some((a) => a.enabled);
    }

    out.push(entry);

    if (item.items && item.items.length) {
      out.push(...walkItems(item.items, collectionPath, currentDepth + 1, maxDepth));
    }
  }
  return out;
};

const listEnvironments = (collectionPath) => {
  const envDir = path.join(collectionPath, 'environments');
  if (!fs.existsSync(envDir)) return [];
  return fs.readdirSync(envDir)
    .filter((f) => f.endsWith('.bru') || f.endsWith('.yml') || f.endsWith('.json'))
    .map((f) => ({
      type: 'environment',
      path: path.join('environments', f),
      name: f.replace(/\.(bru|yml|json)$/, '')
    }));
};

// Pure core — callable from yargs and from bru serve. Throws CliError on user errors.
const runCore = ({ collectionPath: cp, depth } = {}) => {
  const collectionPath = cp || process.cwd();

  if (!fs.existsSync(collectionPath) || !fs.statSync(collectionPath).isDirectory()) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
      message: `Collection path does not exist or is not a directory: ${collectionPath}`
    });
  }

  let collection;
  try {
    collection = createCollectionJsonFromPathname(collectionPath);
  } catch (err) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_NOT_IN_COLLECTION,
      message: `Could not load collection at ${collectionPath}: ${err.message}`
    });
  }

  const items = walkItems(collection.items || [], collectionPath, 1, depth);
  const environments = listEnvironments(collectionPath);

  return {
    kind: 'ls',
    data: {
      collection: {
        name: collection?.brunoConfig?.name || collection?.name || null,
        path: collectionPath,
        format: collection?.format || null
      },
      items,
      environments,
      counts: {
        items: items.length,
        requests: items.filter((i) => i.type === 'request').length,
        folders: items.filter((i) => i.type === 'folder').length,
        environments: environments.length
      }
    }
  };
};

const handler = async (argv) => {
  const writer = buildWriterFromArgv(argv);
  const collectionPath = argv['collection-path']
    ? path.resolve(process.cwd(), argv['collection-path'])
    : process.cwd();
  try {
    emitResult(writer, runCore({ collectionPath, depth: argv.depth }));
  } catch (err) {
    if (err instanceof CliError) {
      writer.exitWithError({ code: err.code, name: err.name, message: err.message });
    } else { throw err; }
  }
};

module.exports = {
  command,
  desc,
  builder,
  handler,
  runCore
};
