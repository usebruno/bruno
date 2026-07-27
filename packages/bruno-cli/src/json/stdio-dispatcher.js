const { runCore: introspectCore } = require('../commands/introspect');
const { runCore: lsCore } = require('../commands/ls');
const { runCore: getCore } = require('../commands/get');
const { runCore: schemaCore } = require('../commands/schema');
const { addCore, editCore, deleteCore } = require('../commands/request');
const { CliError } = require('./cli-error');
const { EXIT_STATUS, CLI_VERSION } = require('../constants');

// Map of command-name (the dotted string an agent sends in {command: "..."}) to the
// pure handler from each commands/*.js file. Each handler takes a single object of
// args and returns { kind, data } or throws CliError.
const HANDLERS = {
  'introspect': () => introspectCore(),
  'ls': (args) => lsCore({ collectionPath: args.collection_path, depth: args.depth }),
  'get': (args) => getCore({
    collectionPath: args.collection_path,
    kind: args.kind,
    resourcePath: args.path
  }),
  'schema': (args) => schemaCore({ kind: args.kind }),
  'request.add': (args) => addCore({
    collectionPath: args.collection_path,
    path: args.path,
    data: args.data,
    ifNotExists: args.if_not_exists
  }),
  'request.edit': (args) => editCore({
    collectionPath: args.collection_path,
    path: args.path,
    patch: args.patch
  }),
  'request.delete': (args) => deleteCore({
    collectionPath: args.collection_path,
    path: args.path
  })
};

const SUPPORTED_COMMANDS = Object.keys(HANDLERS).sort();

const dispatch = ({ command, args = {} } = {}, { defaultCollectionPath } = {}) => {
  if (typeof command !== 'string') {
    throw new CliError({
      code: EXIT_STATUS.ERROR_INCORRECT_ENV_OVERRIDE,
      message: 'Each request envelope must include a "command" string field.'
    });
  }
  const handler = HANDLERS[command];
  if (!handler) {
    throw new CliError({
      code: EXIT_STATUS.ERROR_GENERIC,
      name: 'unknown_command',
      message: `Unknown command "${command}". Supported: ${SUPPORTED_COMMANDS.join(', ')}`
    });
  }
  // Apply the dispatcher's default collection path when the per-command args
  // didn't supply one. Agents launching serve from a non-collection cwd can pass
  // collection_path on every command, but the typical case is "serve from the
  // collection root and omit the field."
  const enriched = { ...args };
  if (defaultCollectionPath && !enriched.collection_path) {
    enriched.collection_path = defaultCollectionPath;
  }
  return handler(enriched);
};

const buildResponse = ({ id, version, kind, ok, data, error }) => {
  const env = { id, version, kind, ok };
  if (data !== undefined) env.data = data;
  if (error !== undefined) env.error = error;
  env.meta = { cli_version: CLI_VERSION };
  return env;
};

// Convenience for serve.js: wrap a dispatch call into a complete response envelope.
// Catches CliError (and unexpected errors) so the serve loop never crashes on bad input.
const handleEnvelope = (input, { version, defaultCollectionPath } = {}) => {
  const id = input && typeof input === 'object' ? input.id : undefined;
  try {
    const result = dispatch(input, { defaultCollectionPath });
    return buildResponse({ id, version, kind: result.kind, ok: true, data: result.data });
  } catch (err) {
    if (err instanceof CliError) {
      return buildResponse({
        id,
        version,
        kind: 'error',
        ok: false,
        error: { code: err.code, name: err.name, message: err.message, ...(err.details ? { details: err.details } : {}) }
      });
    }
    return buildResponse({
      id,
      version,
      kind: 'error',
      ok: false,
      error: { code: EXIT_STATUS.ERROR_GENERIC, name: 'internal_error', message: err.message || String(err) }
    });
  }
};

module.exports = {
  dispatch,
  handleEnvelope,
  buildResponse,
  HANDLERS,
  SUPPORTED_COMMANDS
};
