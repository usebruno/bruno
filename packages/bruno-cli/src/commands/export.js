const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const jsyaml = require('js-yaml');
const { brunoToOpenApi } = require('@usebruno/converters');
const { sanitizeName } = require('@usebruno/common').utils;
const { createCollectionJsonFromPathname, getCollectionFormat } = require('../utils/collection');
const { loadEnvironments } = require('../utils/environment');
const { toApiSpecCollectionData } = require('../utils/api-spec');
const { isDirectory } = require('../utils/filesystem');
const { EXIT_STATUS } = require('../constants');

const command = 'export <type>';
const desc = 'Export a collection to other formats (OpenAPI)';

const EXPORT_TYPES = ['openapi'];

const OUTPUT_FORMAT_BY_EXTENSION = {
  '': 'yaml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json'
};

const builder = (yargs) => {
  return yargs
    .positional('type', {
      describe: 'Format to export the collection to',
      type: 'string',
      choices: EXPORT_TYPES
    })
    .option('source', {
      alias: 's',
      describe: 'Path to the collection directory (defaults to the current directory)',
      type: 'string'
    })
    .option('output-file', {
      alias: 'f',
      describe: 'Path to the output file; .json writes JSON, .yaml, .yml or no extension writes YAML (defaults to <collection-name>.yaml)',
      type: 'string'
    })
    .example('$0 export openapi', 'Export the collection in the current directory to <collection-name>.yaml')
    .example('$0 export openapi --source ./my-collection --output-file api.yaml', 'Export a collection to a YAML file')
    .example('$0 export openapi -s ./my-collection -f api.json', 'Export a collection to a JSON file');
};

const exitWithError = (message, exitCode) => {
  console.error(chalk.red(message));
  process.exit(exitCode);
};

const getOutputFormat = (outputPath) => OUTPUT_FORMAT_BY_EXTENSION[path.extname(outputPath).toLowerCase()];

const serializeSpec = (spec, format) => (format === 'json' ? `${JSON.stringify(spec, null, 2)}\n` : jsyaml.dump(spec));

const ensureOutputDirectory = (outputPath) => {
  const outputDirectory = path.dirname(outputPath);
  try {
    fs.mkdirSync(outputDirectory, { recursive: true });
  } catch (error) {
    exitWithError(`Could not create the output directory ${outputDirectory}: ${error.message}`, EXIT_STATUS.ERROR_MISSING_OUTPUT_DIR);
  }
};

const getCollectionName = (collection, collectionPath) => sanitizeName(collection.brunoConfig?.name || path.basename(collectionPath));

const exportOpenApi = async (collectionPath, outputFile) => {
  if (!isDirectory(collectionPath)) {
    exitWithError(`Collection not found: ${collectionPath}`, EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
  }
  const collectionFormat = getCollectionFormat(collectionPath);
  if (!collectionFormat) {
    exitWithError(`No bruno.json or opencollection.yml found in ${collectionPath}`, EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
  }
  if (outputFile && !getOutputFormat(outputFile)) {
    exitWithError(`Unsupported output file extension: ${path.extname(outputFile)} (use .json, .yaml or .yml)`, EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT);
  }

  global.brunoSkippedFiles = [];
  let collection;
  try {
    collection = createCollectionJsonFromPathname(collectionPath);
  } catch (error) {
    exitWithError(`Failed to read the collection at ${collectionPath}: ${error.message}`, EXIT_STATUS.ERROR_INVALID_FILE);
  }

  let environments;
  try {
    environments = await loadEnvironments(collectionPath, collectionFormat);
  } catch (error) {
    exitWithError(`Failed to parse environment file: ${error.message}`, EXIT_STATUS.ERROR_INVALID_FILE);
  }

  const collectionName = getCollectionName(collection, collectionPath);
  const outputPath = path.resolve(outputFile || `${collectionName}.yaml`);
  ensureOutputDirectory(outputPath);

  let exported;
  try {
    exported = brunoToOpenApi(collectionName, toApiSpecCollectionData(collection, environments), '');
  } catch (error) {
    exitWithError(`Failed to export the OpenAPI spec: ${error.message}`, EXIT_STATUS.ERROR_GENERIC);
  }

  ensureOutputDirectory(outputPath);
  try {
    fs.writeFileSync(outputPath, serializeSpec(exported.content, getOutputFormat(outputPath)));
  } catch (error) {
    exitWithError(`Failed to write ${outputPath}: ${error.message}`, EXIT_STATUS.ERROR_GENERIC);
  }

  console.log(chalk.green(`OpenAPI spec exported: ${outputPath}`));
  exported.warnings.forEach(({ message, itemName }) => console.error(chalk.yellow(`Warning: ${itemName ? `${itemName}: ` : ''}${message}`)));
  if (global.brunoSkippedFiles.length > 0) {
    console.error(chalk.yellow(`${global.brunoSkippedFiles.length} file(s) could not be parsed and were left out of the spec.`));
  }
};

const handler = async (argv) => {
  const { type, source, outputFile } = argv;

  if (!EXPORT_TYPES.includes(type)) {
    exitWithError(`Export type must be one of: ${EXPORT_TYPES.join(', ')}`, EXIT_STATUS.ERROR_GENERIC);
  }

  await exportOpenApi(path.resolve(source || process.cwd()), outputFile);
};

module.exports = {
  command,
  desc,
  builder,
  handler
};
