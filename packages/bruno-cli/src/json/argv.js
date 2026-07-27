const { createWriter } = require('./envelope');
const { negotiateVersion } = require('./version');
const { EXIT_STATUS, CLI_VERSION } = require('../constants');

// Adds --json + --json-version to a yargs builder. Reuse from every new command
// so the flag surface is identical across the CLI.
const addJsonOptions = (yargs) => yargs
  .option('json', {
    type: 'boolean',
    default: false,
    description: 'Emit a versioned JSON envelope on stdout; structured error envelope on stderr.'
  })
  .option('json-version', {
    type: 'number',
    description: 'Pin the JSON contract version (current: 1). Only valid with --json.'
  });

// Build the writer, validate the requested version, and silence chalk chatter
// so JSON-mode stdout is exclusively envelopes. Mirrors what run.js does inline.
const buildWriterFromArgv = (argv) => {
  const jsonMode = Boolean(argv.json);
  const negotiatedVersion = jsonMode ? negotiateVersion(argv.jsonVersion) : null;
  const writer = createWriter({ json: jsonMode, version: negotiatedVersion || undefined });
  if (jsonMode) {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
  }
  if (jsonMode && negotiatedVersion === null) {
    writer.exitWithError({
      code: EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT,
      message: `Unsupported --json-version: ${argv.jsonVersion}. Supported: 1`
    });
  }
  return writer;
};

// Single-shot result emission. NDJSON line on stdout in JSON mode; pretty-printed
// envelope on stdout otherwise. Same shape both ways so the contract is uniform.
const emitResult = (writer, { kind, data, meta = {} }) => {
  if (writer.enabled) {
    writer.writeEnvelope({ kind, ok: true, data, meta });
    return;
  }
  const env = {
    version: writer.version,
    kind,
    ok: true,
    data,
    meta: { cli_version: CLI_VERSION, ...meta }
  };
  process.stdout.write(JSON.stringify(env, null, 2) + '\n');
};

module.exports = {
  addJsonOptions,
  buildWriterFromArgv,
  emitResult
};
