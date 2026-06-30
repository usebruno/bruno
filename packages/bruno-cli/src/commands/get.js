const fs = require('fs');
const path = require('path');
const {
  parseRequest,
  parseCollection,
  parseFolder,
  parseEnvironment
} = require('@usebruno/filestore');
const { FORMAT_CONFIG } = require('../utils/collection');
const { addJsonOptions, buildWriterFromArgv, emitResult } = require('../json/argv');
const { EXIT_STATUS } = require('../constants');

const command = 'get <kind> [resource-path]';
const desc = 'Read a request, folder, environment, or collection and emit it as JSON';

const KINDS = ['request', 'folder', 'environment', 'collection'];

const builder = (yargs) => {
  yargs
    .positional('kind', {
      type: 'string',
      describe: 'Resource type',
      choices: KINDS
    })
    .positional('resource-path', {
      type: 'string',
      describe: 'Relative path to the resource (omit for collection)'
    });
  addJsonOptions(yargs)
    .example('$0 get request auth/login.bru --json', 'Read a request as JSON')
    .example('$0 get environment Local --json', 'Read an environment by name')
    .example('$0 get collection --json', 'Read the collection root');
};

const detectCollectionFormat = (collectionPath) => {
  if (fs.existsSync(path.join(collectionPath, 'opencollection.yml'))) return 'yml';
  return 'bru';
};

const resolveEnvironmentPath = (collectionPath, name, format) => {
  // Allow either a literal name (resolved against environments/) or a relative path.
  if (name.endsWith('.bru') || name.endsWith('.yml') || name.endsWith('.json')) {
    return path.resolve(collectionPath, name);
  }
  const ext = format === 'yml' ? '.yml' : '.bru';
  return path.join(collectionPath, 'environments', `${name}${ext}`);
};

const readResource = (kind, resourcePath, collectionPath, writer) => {
  const format = detectCollectionFormat(collectionPath);

  if (kind === 'collection') {
    const rootFile = FORMAT_CONFIG[format].collectionFile;
    const filePath = path.join(collectionPath, rootFile);
    if (!fs.existsSync(filePath)) {
      writer.exitWithError({
        code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
        message: `Collection root file not found: ${filePath}`
      });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return {
      kind: 'collection',
      path: path.relative(collectionPath, filePath),
      data: parseCollection(content, { format })
    };
  }

  if (!resourcePath) {
    writer.exitWithError({
      code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
      message: `<resource-path> is required for kind="${kind}"`
    });
  }

  if (kind === 'environment') {
    const resolved = resolveEnvironmentPath(collectionPath, resourcePath, format);
    if (!fs.existsSync(resolved)) {
      writer.exitWithError({
        code: EXIT_STATUS.ERROR_ENV_NOT_FOUND,
        message: `Environment file not found: ${resolved}`
      });
    }
    const ext = path.extname(resolved).slice(1) || 'bru';
    const content = fs.readFileSync(resolved, 'utf8');
    return {
      kind: 'environment',
      path: path.relative(collectionPath, resolved),
      data: parseEnvironment(content, { format: ext === 'yml' ? 'yml' : 'bru' })
    };
  }

  // request | folder
  const resolved = path.resolve(collectionPath, resourcePath);
  if (kind === 'request') {
    // Auto-append the collection's request extension if missing.
    const ext = FORMAT_CONFIG[format].ext;
    const finalPath = resolved.endsWith(ext) ? resolved : `${resolved}${ext}`;
    if (!fs.existsSync(finalPath)) {
      writer.exitWithError({
        code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
        message: `Request file not found: ${finalPath}`
      });
    }
    const content = fs.readFileSync(finalPath, 'utf8');
    return {
      kind: 'request',
      path: path.relative(collectionPath, finalPath),
      data: parseRequest(content, { format })
    };
  }

  // folder
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    writer.exitWithError({
      code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
      message: `Folder not found: ${resolved}`
    });
  }
  const folderFile = path.join(resolved, FORMAT_CONFIG[format].folderFile);
  const data = fs.existsSync(folderFile)
    ? parseFolder(fs.readFileSync(folderFile, 'utf8'), { format })
    : null;
  return {
    kind: 'folder',
    path: path.relative(collectionPath, resolved),
    data
  };
};

const handler = async (argv) => {
  const writer = buildWriterFromArgv(argv);
  const collectionPath = process.cwd();
  const kind = argv.kind;
  const resourcePath = argv['resource-path'];

  if (!KINDS.includes(kind)) {
    writer.exitWithError({
      code: EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT,
      message: `Unknown kind "${kind}". Expected one of: ${KINDS.join(', ')}`
    });
  }

  const result = readResource(kind, resourcePath, collectionPath, writer);

  emitResult(writer, {
    kind: `${kind}.get`,
    data: {
      collection_path: collectionPath,
      path: result.path,
      [kind]: result.data
    }
  });
};

module.exports = {
  command,
  desc,
  builder,
  handler
};
