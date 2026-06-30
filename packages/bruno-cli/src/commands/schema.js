const { addJsonOptions, buildWriterFromArgv, emitResult } = require('../json/argv');
const { EXIT_STATUS } = require('../constants');
const { JSON_CONTRACT_VERSION } = require('../json/version');

const command = 'schema <kind>';
const desc = 'Emit the JSON Schema for a Bruno resource (stub — populated in PR 4)';

const KINDS = ['request', 'folder', 'environment', 'collection', 'collection-var', 'cli-output'];

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

// Stub schemas. Real schemas are generated in PR 4 from @usebruno/schema (Yup)
// and committed under packages/bruno-cli/schemas/v1/. Agents that depend on this
// command should treat $comment="stub" as "schema not yet authoritative" and fall
// back to inspecting `bru get <kind>` output.
const STUB_SCHEMA = (kind) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `https://usebruno.com/schemas/v${JSON_CONTRACT_VERSION}/${kind}.json`,
  $comment: 'stub — populated in PR 4',
  title: `Bruno ${kind} (stub)`,
  type: 'object',
  additionalProperties: true
});

const handler = async (argv) => {
  const writer = buildWriterFromArgv(argv);
  const kind = argv.kind;

  if (!KINDS.includes(kind)) {
    writer.exitWithError({
      code: EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT,
      message: `Unknown schema kind "${kind}". Expected one of: ${KINDS.join(', ')}`
    });
  }

  emitResult(writer, {
    kind: 'schema',
    data: {
      resource: kind,
      status: 'stub',
      schema: STUB_SCHEMA(kind)
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
