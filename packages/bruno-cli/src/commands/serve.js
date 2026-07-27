const path = require('path');
const readline = require('readline');
const { JSON_CONTRACT_VERSION, negotiateVersion } = require('../json/version');
const { handleEnvelope } = require('../json/stdio-dispatcher');
const { CLI_VERSION, EXIT_STATUS } = require('../constants');

const command = 'serve';
const desc = 'Long-lived NDJSON dispatcher — reads command envelopes on stdin, writes responses on stdout';

const builder = (yargs) => {
  yargs
    .option('stdio', {
      type: 'boolean',
      default: false,
      description: 'Use stdin/stdout for command transport. Required today; reserved for future transports.'
    })
    .option('collection', {
      type: 'string',
      description: 'Default collection path used when an incoming command does not specify one (default: cwd).'
    })
    .option('json-version', {
      type: 'number',
      description: `Pin the JSON contract version (current: ${JSON_CONTRACT_VERSION}).`
    })
    .example('$0 serve --stdio', 'Start the dispatcher; pipe NDJSON commands to stdin.');
};

// Serve handler. Reads NDJSON command envelopes from stdin line-by-line, hands each
// off to the dispatcher, and writes the response envelope back to stdout. Each
// response carries the originating `id` so an async agent can correlate.
//
// Commands are processed sequentially in arrival order — no concurrent dispatch in
// v1. That's enough to deliver the cache-warm win (one Node + bruno-lang load per
// session instead of per call); true concurrency lands when something actually
// demands it.
const handler = async (argv) => {
  if (!argv.stdio) {
    // No transport selected. Print a structured error envelope so the agent sees
    // the failure mode even when invoked with `bru serve` alone.
    const env = {
      version: JSON_CONTRACT_VERSION,
      kind: 'error',
      ok: false,
      error: {
        code: EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT,
        name: 'serve_transport_required',
        message: 'bru serve requires --stdio in v1. No other transport is implemented yet.'
      }
    };
    process.stderr.write(JSON.stringify(env) + '\n');
    process.exit(EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT);
  }

  const requestedVersion = argv['json-version'];
  const negotiatedVersion = negotiateVersion(requestedVersion);
  if (negotiatedVersion === null) {
    const env = {
      version: JSON_CONTRACT_VERSION,
      kind: 'error',
      ok: false,
      error: {
        code: EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT,
        name: 'invalid_output_format',
        message: `Unsupported --json-version: ${requestedVersion}. Supported: ${JSON_CONTRACT_VERSION}`
      }
    };
    process.stderr.write(JSON.stringify(env) + '\n');
    process.exit(EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT);
  }

  const defaultCollectionPath = argv.collection
    ? path.resolve(process.cwd(), argv.collection)
    : process.cwd();

  // Emit a hello envelope so agents can detect a live serve loop and see the
  // negotiated version. This is the only unsolicited envelope; everything else is
  // a response to an inbound command.
  process.stdout.write(JSON.stringify({
    version: negotiatedVersion,
    kind: 'serve.ready',
    ok: true,
    data: {
      cli_version: CLI_VERSION,
      json_contract_version: negotiatedVersion,
      default_collection_path: defaultCollectionPath
    },
    meta: { cli_version: CLI_VERSION }
  }) + '\n');

  // Per-line reader. readline handles `\n`/`\r\n` and ignores trailing partial lines
  // until EOF. Each line is one complete command envelope.
  const rl = readline.createInterface({ input: process.stdin });

  let shouldExit = false;

  rl.on('line', (line) => {
    if (shouldExit) return;
    const trimmed = line.trim();
    if (!trimmed) return; // skip blank lines

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      process.stdout.write(JSON.stringify({
        version: negotiatedVersion,
        kind: 'error',
        ok: false,
        error: {
          code: EXIT_STATUS.ERROR_INCORRECT_ENV_OVERRIDE,
          name: 'envelope_invalid_json',
          message: `Could not parse line as JSON: ${err.message}`
        },
        meta: { cli_version: CLI_VERSION }
      }) + '\n');
      return;
    }

    if (parsed && parsed.command === 'shutdown') {
      process.stdout.write(JSON.stringify({
        id: parsed.id,
        version: negotiatedVersion,
        kind: 'serve.shutdown',
        ok: true,
        meta: { cli_version: CLI_VERSION }
      }) + '\n');
      shouldExit = true;
      rl.close();
      return;
    }

    const response = handleEnvelope(parsed, {
      version: negotiatedVersion,
      defaultCollectionPath
    });
    process.stdout.write(JSON.stringify(response) + '\n');
  });

  // EOF closes the readline. Resolve once the loop is done so yargs can return
  // (and the process exits 0 unless a fatal error occurred earlier).
  await new Promise((resolve) => rl.once('close', resolve));
};

module.exports = {
  command,
  desc,
  builder,
  handler
};
