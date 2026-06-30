const fs = require('fs');
const path = require('path');
const { addJsonOptions, buildWriterFromArgv, emitResult } = require('../json/argv');
const { EXIT_STATUS } = require('../constants');
const { JSON_CONTRACT_VERSION } = require('../json/version');

const command = 'schema <kind>';
const desc = 'Emit the JSON Schema for a Bruno resource';

// kind → file under schemas/v1/. Keep ordered the same way as introspect's KINDS.
const KIND_TO_FILE = {
  'request': 'request.json',
  'folder': 'folder.json',
  'environment': 'environment.json',
  'environments': 'environments.json',
  'collection': 'collection.json',
  'collection-var': 'collection-var.json',
  'cli-output': 'cli-output.json'
};

const KINDS = Object.keys(KIND_TO_FILE);

const SCHEMAS_DIR = path.resolve(__dirname, '..', '..', 'schemas', `v${JSON_CONTRACT_VERSION}`);

const builder = (yargs) => {
  yargs
    .positional('kind', {
      type: 'string',
      describe: 'Resource kind',
      choices: KINDS
    });
  addJsonOptions(yargs)
    .example('$0 schema request --json', 'Emit the JSON Schema for a request payload');
};

const readSchema = (kind) => {
  const file = KIND_TO_FILE[kind];
  if (!file) return null;
  const target = path.join(SCHEMAS_DIR, file);
  if (!fs.existsSync(target)) return null;
  return JSON.parse(fs.readFileSync(target, 'utf8'));
};

const handler = async (argv) => {
  const writer = buildWriterFromArgv(argv);
  const kind = argv.kind;

  if (!KINDS.includes(kind)) {
    writer.exitWithError({
      code: EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT,
      message: `Unknown schema kind "${kind}". Expected one of: ${KINDS.join(', ')}`
    });
  }

  const schema = readSchema(kind);
  if (!schema) {
    writer.exitWithError({
      code: EXIT_STATUS.ERROR_FILE_NOT_FOUND,
      message: `Schema file missing for kind "${kind}". Run: node scripts/generate-schemas.js`
    });
  }

  emitResult(writer, {
    kind: 'schema',
    data: {
      resource: kind,
      source: schema['x-source'] || 'unknown',
      schema
    }
  });
};

module.exports = {
  command,
  desc,
  builder,
  handler,
  KINDS
};
