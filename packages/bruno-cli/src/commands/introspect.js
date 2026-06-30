const { CLI_VERSION, EXIT_STATUS } = require('../constants');
const { JSON_CONTRACT_VERSION, SUPPORTED_VERSIONS } = require('../json/version');
const { ERROR_NAMES } = require('../json/error-names');
const { addJsonOptions, buildWriterFromArgv, emitResult } = require('../json/argv');

const command = 'introspect';
const desc = 'Emit the CLI command tree, exit codes, and JSON contract version for agent consumption';

const builder = (yargs) => {
  addJsonOptions(yargs)
    .example('$0 introspect --json', 'Emit a machine-readable description of every command and flag.');
};

// Hand-authored command tree. Update this when a command/flag is added — the
// snapshot test (tests/integration/agent-commands.spec.js) enforces drift detection.
const COMMANDS = [
  {
    name: 'run',
    summary: 'Run one or more requests/folders',
    args: [{ name: 'paths', variadic: true, type: 'path' }],
    notable_flags: [
      { name: '--env', type: 'string', summary: 'Environment name to load' },
      { name: '--env-file', type: 'string', summary: 'Path to environment file (.bru/.json/.yml)' },
      { name: '--env-var', type: 'string', summary: 'Overwrite a single env var; repeatable' },
      { name: '--bail', type: 'boolean', summary: 'Stop on first failing request/test/assertion' },
      { name: '--tests-only', type: 'boolean', summary: 'Only run requests with executable tests' },
      { name: '--reporter-json', type: 'path', summary: 'Write final JSON summary to a file' },
      { name: '--reporter-junit', type: 'path', summary: 'Write JUnit XML to a file' },
      { name: '--reporter-html', type: 'path', summary: 'Write HTML report to a file' },
      { name: '--json', type: 'boolean', summary: 'Emit NDJSON event stream on stdout' },
      { name: '--json-version', type: 'number', summary: 'Pin the JSON contract version' }
    ],
    streams_ndjson: true,
    event_kinds: ['run.start', 'request.start', 'request.response', 'assertion.result', 'test.result', 'request.end', 'run.end']
  },
  {
    name: 'introspect',
    summary: 'Emit the CLI command tree and JSON contract version',
    args: [],
    notable_flags: [
      { name: '--json', type: 'boolean', summary: 'Emit a single envelope (NDJSON line) instead of pretty JSON' },
      { name: '--json-version', type: 'number', summary: 'Pin the JSON contract version' }
    ]
  },
  {
    name: 'ls',
    summary: 'List the items (folders + requests + environments) in a collection',
    args: [{ name: 'path', variadic: false, type: 'path', optional: true, summary: 'Collection root (default: cwd)' }],
    notable_flags: [
      { name: '--depth', type: 'number', summary: 'Limit recursion depth' },
      { name: '--json', type: 'boolean' },
      { name: '--json-version', type: 'number' }
    ]
  },
  {
    name: 'get',
    summary: 'Read a single resource (request/folder/environment/collection) and emit it as JSON',
    args: [
      { name: 'kind', variadic: false, type: 'string', choices: ['request', 'folder', 'environment', 'collection'] },
      { name: 'path', variadic: false, type: 'path', optional: true, summary: 'Required for request/folder/environment; omitted for collection' }
    ],
    notable_flags: [
      { name: '--json', type: 'boolean' },
      { name: '--json-version', type: 'number' }
    ]
  },
  {
    name: 'schema',
    summary: 'Emit the JSON Schema for a Bruno resource so agents can author payloads safely',
    args: [{ name: 'kind', variadic: false, type: 'string', choices: ['request', 'folder', 'environment', 'environments', 'collection', 'collection-var', 'cli-output'] }],
    notable_flags: [
      { name: '--json', type: 'boolean' },
      { name: '--json-version', type: 'number' }
    ]
  },
  {
    name: 'import',
    summary: 'Import a collection from OpenAPI or WSDL',
    args: [{ name: 'type', variadic: false, type: 'string', choices: ['openapi', 'wsdl'] }],
    notable_flags: [
      { name: '--source', type: 'string', summary: 'File path or URL' },
      { name: '--output', type: 'path', summary: 'Output directory' },
      { name: '--collection-name', type: 'string' }
    ]
  }
];

const handler = async (argv) => {
  const writer = buildWriterFromArgv(argv);

  emitResult(writer, {
    kind: 'introspect',
    data: {
      cli_version: CLI_VERSION,
      json_contract_version: JSON_CONTRACT_VERSION,
      supported_json_versions: SUPPORTED_VERSIONS,
      exit_codes: Object.entries(EXIT_STATUS).map(([constant, code]) => ({
        code,
        constant,
        name: ERROR_NAMES[code] || 'internal_error'
      })),
      commands: COMMANDS
    }
  });
};

module.exports = {
  command,
  desc,
  builder,
  handler,
  COMMANDS
};
