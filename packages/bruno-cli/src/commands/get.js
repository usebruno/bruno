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
const { CliError } = require('../json/cli-error');
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

const readResource = (kind, resourcePath, collectionPath) => {
  const format = detectCollectionFormat(collectionPath);

  if (kind === 'collection') {
    const rootFile = FORMAT_CONFIG[format].collectionFile;
    const filePath = path.join(collectionPath, rootFile);
    if (!fs.existsSync(filePath)) {
      throw new CliError({
        code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
        message: `Collection root file not found: ${filePath}`
      });
    }
    return {
      kind: 'collection',
      path: path.relative(collectionPath, filePath),
      data: parseCollection(fs.readFileSync(filePath, 'utf8'), { format })
    };
  }

  if (!resourcePath) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
      message: `<resource-path> is required for kind="${kind}"`
    });
  }

  if (kind === 'environment') {
    const resolved = resolveEnvironmentPath(collectionPath, resourcePath, format);
    if (!fs.existsSync(resolved)) {
      throw new CliError({
        code: EXIT_STATUS.ERROR_ENV_NOT_FOUND,
        message: `Environment file not found: ${resolved}`
      });
    }
    const ext = path.extname(resolved).slice(1) || 'bru';
    return {
      kind: 'environment',
      path: path.relative(collectionPath, resolved),
      data: parseEnvironment(fs.readFileSync(resolved, 'utf8'), { format: ext === 'yml' ? 'yml' : 'bru' })
    };
  }

  const resolved = path.resolve(collectionPath, resourcePath);
  if (kind === 'request') {
    const ext = FORMAT_CONFIG[format].ext;
    const finalPath = resolved.endsWith(ext) ? resolved : `${resolved}${ext}`;
    if (!fs.existsSync(finalPath)) {
      throw new CliError({
        code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
        message: `Request file not found: ${finalPath}`
      });
    }
    return {
      kind: 'request',
      path: path.relative(collectionPath, finalPath),
      data: parseRequest(fs.readFileSync(finalPath, 'utf8'), { format })
    };
  }

  // folder
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new CliError({
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

const runCore = ({ collectionPath: cp, kind, resourcePath } = {}) => {
  const collectionPath = cp || process.cwd();
  if (!KINDS.includes(kind)) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT,
      message: `Unknown kind "${kind}". Expected one of: ${KINDS.join(', ')}`
    });
  }
  const result = readResource(kind, resourcePath, collectionPath);
  return {
    kind: `${kind}.get`,
    data: {
      collection_path: collectionPath,
      path: result.path,
      [kind]: result.data
    }
  };
};

const handler = async (argv) => {
  const writer = buildWriterFromArgv(argv);
  try {
    emitResult(writer, runCore({
      collectionPath: process.cwd(),
      kind: argv.kind,
      resourcePath: argv['resource-path']
    }));
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
  runCore,
  KINDS
};
