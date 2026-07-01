const fs = require('fs');
const path = require('path');
const { parseRequest, stringifyRequest } = require('@usebruno/filestore');
const { FORMAT_CONFIG } = require('../utils/collection');
const { writeFileAtomicSync } = require('../utils/filesystem');
const { addJsonOptions, buildWriterFromArgv, emitResult } = require('../json/argv');
const { CliError } = require('../json/cli-error');
const { mergePatch } = require('../json/merge-patch');
const { EXIT_STATUS } = require('../constants');

const command = 'request <action>';
const desc = 'Create, edit, or delete a request file';

const detectCollectionFormat = (collectionPath) =>
  fs.existsSync(path.join(collectionPath, 'opencollection.yml')) ? 'yml' : 'bru';

const ensureBruExt = (p, format) => {
  const ext = FORMAT_CONFIG[format].ext;
  return p.endsWith(ext) ? p : `${p}${ext}`;
};

const resolvePath = (collectionPath, relPath, format) =>
  ensureBruExt(path.resolve(collectionPath, relPath), format);

// Coerce a payload argument into a parsed JS value.
//   - undefined/null → CliError
//   - "-"            → read all of stdin (synchronously; agents pipe and wait)
//   - any other      → parse the value as JSON inline
// In serve mode the dispatcher pre-parses payloads from the command envelope, so
// the typeof check lets it pass plain objects/arrays straight through.
const coercePayload = (arg, flagName) => {
  if (arg === undefined || arg === null) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_INCORRECT_ENV_OVERRIDE,
      message: `Missing required ${flagName} payload (use ${flagName} '<json>' or ${flagName}=- to read stdin).`
    });
  }
  if (typeof arg === 'object') return arg;
  const raw = arg === '-' ? fs.readFileSync(0, 'utf8') : arg;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_INCORRECT_ENV_OVERRIDE,
      message: `Could not parse ${flagName} payload as JSON: ${err.message}`
    });
  }
};

const addBuilder = (yargs) => {
  yargs
    .positional('path', { type: 'string', describe: 'Relative path of the new request (with or without .bru)' })
    .option('data', { alias: 'd', type: 'string', describe: 'Request payload as JSON (or "-" for stdin)' })
    .option('if-not-exists', { type: 'boolean', default: false, describe: 'Succeed silently if the request already exists' })
    .example('$0 request add auth/login.bru --data \'{"type":"http-request","name":"login","request":{"method":"POST","url":"{{host}}/login"}}\'')
    .example('cat req.json | $0 request add auth/login.bru --data=-', 'Use --data=- (not --data -) so yargs treats the dash as the flag value.');
};

const addCore = ({ collectionPath: cp, path: relPath, data, ifNotExists } = {}) => {
  const collectionPath = cp || process.cwd();
  const format = detectCollectionFormat(collectionPath);
  const target = resolvePath(collectionPath, relPath, format);

  if (fs.existsSync(target)) {
    if (ifNotExists) {
      return {
        kind: 'request.add',
        data: {
          path: path.relative(collectionPath, target),
          status: 'unchanged',
          reason: 'already_exists'
        }
      };
    }
    throw new CliError({
      code: EXIT_STATUS.ERROR_GENERIC,
      message: `Request already exists: ${path.relative(collectionPath, target)}. Pass --if-not-exists to make this a no-op.`
    });
  }

  const payload = coercePayload(data, '--data');
  let serialised;
  try {
    serialised = stringifyRequest(payload, { format });
  } catch (err) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_INVALID_FILE,
      message: `Could not serialise request payload: ${err.message}`
    });
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  writeFileAtomicSync(target, serialised);

  return {
    kind: 'request.add',
    data: {
      path: path.relative(collectionPath, target),
      status: 'created',
      request: parseRequest(serialised, { format })
    }
  };
};

const addHandler = async (argv) => {
  const writer = buildWriterFromArgv(argv);
  try {
    emitResult(writer, addCore({
      collectionPath: process.cwd(),
      path: argv.path,
      data: argv.data,
      ifNotExists: argv['if-not-exists']
    }));
  } catch (err) {
    if (err instanceof CliError) {
      writer.exitWithError({ code: err.code, name: err.name, message: err.message });
    } else { throw err; }
  }
};

const editBuilder = (yargs) => {
  yargs
    .positional('path', { type: 'string', describe: 'Relative path of the request to edit' })
    .option('patch', { type: 'string', describe: 'JSON Merge Patch (RFC 7396) payload, or "-" for stdin' })
    .example('$0 request edit auth/login.bru --patch \'{"request":{"url":"{{host}}/v2/login"}}\'');
};

const editCore = ({ collectionPath: cp, path: relPath, patch } = {}) => {
  const collectionPath = cp || process.cwd();
  const format = detectCollectionFormat(collectionPath);
  const target = resolvePath(collectionPath, relPath, format);

  if (!fs.existsSync(target)) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
      message: `Request file not found: ${path.relative(collectionPath, target)}`
    });
  }

  const patchObj = coercePayload(patch, '--patch');
  const current = parseRequest(fs.readFileSync(target, 'utf8'), { format });
  const next = mergePatch(current, patchObj);

  let serialised;
  try {
    serialised = stringifyRequest(next, { format });
  } catch (err) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_INVALID_FILE,
      message: `Patched payload could not be serialised: ${err.message}`
    });
  }

  writeFileAtomicSync(target, serialised);

  return {
    kind: 'request.edit',
    data: {
      path: path.relative(collectionPath, target),
      status: 'updated',
      request: parseRequest(serialised, { format })
    }
  };
};

const editHandler = async (argv) => {
  const writer = buildWriterFromArgv(argv);
  try {
    emitResult(writer, editCore({
      collectionPath: process.cwd(),
      path: argv.path,
      patch: argv.patch
    }));
  } catch (err) {
    if (err instanceof CliError) {
      writer.exitWithError({ code: err.code, name: err.name, message: err.message });
    } else { throw err; }
  }
};

const deleteBuilder = (yargs) => {
  yargs
    .positional('path', { type: 'string', describe: 'Relative path of the request to delete' })
    .example('$0 request delete auth/login.bru');
};

const deleteCore = ({ collectionPath: cp, path: relPath } = {}) => {
  const collectionPath = cp || process.cwd();
  const format = detectCollectionFormat(collectionPath);
  const target = resolvePath(collectionPath, relPath, format);

  if (!fs.existsSync(target)) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
      message: `Request file not found: ${path.relative(collectionPath, target)}`
    });
  }

  fs.unlinkSync(target);

  return {
    kind: 'request.delete',
    data: {
      path: path.relative(collectionPath, target),
      status: 'deleted'
    }
  };
};

const deleteHandler = async (argv) => {
  const writer = buildWriterFromArgv(argv);
  try {
    emitResult(writer, deleteCore({ collectionPath: process.cwd(), path: argv.path }));
  } catch (err) {
    if (err instanceof CliError) {
      writer.exitWithError({ code: err.code, name: err.name, message: err.message });
    } else { throw err; }
  }
};

const builder = (yargs) => {
  yargs
    .command(
      'add <path>',
      'Create a new request from a JSON payload',
      (sub) => {
        addBuilder(sub); addJsonOptions(sub);
      },
      addHandler
    )
    .command(
      'edit <path>',
      'Apply a JSON Merge Patch to an existing request',
      (sub) => {
        editBuilder(sub); addJsonOptions(sub);
      },
      editHandler
    )
    .command(
      'delete <path>',
      'Delete a request file',
      (sub) => {
        deleteBuilder(sub); addJsonOptions(sub);
      },
      deleteHandler
    )
    .demandCommand(1, 'Specify a subcommand: add | edit | delete');
};

module.exports = {
  command,
  desc,
  builder,
  addCore,
  editCore,
  deleteCore
};
