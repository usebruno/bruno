const { JSON_CONTRACT_VERSION } = require('./version');
const { nameForCode } = require('./error-names');
const { EXIT_STATUS, CLI_VERSION } = require('../constants');

const writeLine = (stream, obj) => {
  stream.write(JSON.stringify(obj) + '\n');
};

const buildErrorPayload = (version, opts = {}) => {
  const code = opts.code != null ? opts.code : EXIT_STATUS.ERROR_GENERIC;
  const name = opts.name || nameForCode(code);
  const payload = {
    version,
    kind: 'error',
    ok: false,
    error: {
      code,
      name,
      message: opts.message || name
    }
  };
  if (opts.hint) payload.error.hint = opts.hint;
  if (opts.docs_url) payload.error.docs_url = opts.docs_url;
  if (opts.details !== undefined) payload.error.details = opts.details;
  return payload;
};

const createWriter = (options = {}) => {
  const json = Boolean(options.json);
  const version = options.version || JSON_CONTRACT_VERSION;
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;

  const buildEnvelope = ({ kind, ok = true, data = null, meta = {} }) => {
    const env = {
      version,
      kind,
      ok,
      data
    };
    env.meta = { cli_version: CLI_VERSION, ...meta };
    return env;
  };

  const writeEnvelope = (envelopeArgs) => {
    if (!json) return;
    writeLine(stdout, buildEnvelope(envelopeArgs));
  };

  const writeError = (errorOpts) => {
    if (!json) return;
    writeLine(stderr, buildErrorPayload(version, errorOpts));
  };

  const exitWithError = (errorOpts = {}) => {
    if (json) {
      writeLine(stderr, buildErrorPayload(version, errorOpts));
    }
    process.exit(errorOpts.code != null ? errorOpts.code : EXIT_STATUS.ERROR_GENERIC);
  };

  return {
    enabled: json,
    version,
    writeEnvelope,
    writeEvent: writeEnvelope,
    writeError,
    exitWithError
  };
};

module.exports = {
  createWriter,
  buildErrorPayload
};
