const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const jsyaml = require('js-yaml');
const { brunoToOpenApi } = require('@usebruno/converters');
const { sanitizeName } = require('@usebruno/common').utils;
const { getCollectionFormat } = require('../../utils/collection');
const { readCollectionConfig, readCollectionForApiSpec } = require('../../utils/collection-reader');
const { isDirectory } = require('../../utils/filesystem');
const { EXIT_STATUS } = require('../../constants');

const command = 'openapi';
const desc = 'Export the collection as an OpenAPI spec';

const OUTPUT_FORMAT_BY_EXTENSION = {
  '': 'yaml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json'
};

const builder = (yargs) => {
  return yargs
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

// Named the way the app's Create API Spec names it: the collection's name, or the folder's when it has none
const getCollectionName = (brunoConfig, collectionPath) => sanitizeName(brunoConfig?.name || path.basename(collectionPath));

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

  let collectionData;
  try {
    collectionData = await readCollectionForApiSpec(collectionPath);
  } catch (error) {
    exitWithError(`Failed to read the collection at ${collectionPath}: ${error.message}`, EXIT_STATUS.ERROR_INVALID_FILE);
  }

  const { brunoConfig } = collectionData;
  const collectionName = getCollectionName(brunoConfig, collectionPath);
  const outputPath = path.resolve(outputFile || `${collectionName}.yaml`);
  ensureOutputDirectory(outputPath);

  let exported;
  try {
    exported = brunoToOpenApi(collectionName, collectionData, '');
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
  if (collectionData.skipped.length > 0) {
    console.error(chalk.yellow(`${collectionData.skipped.length} file(s) could not be parsed and were left out of the spec: ${collectionData.skipped.join(', ')}`));
  }
};

const handler = async (argv) => {
  const { source, outputFile } = argv;

  await exportOpenApi(path.resolve(source || process.cwd()), outputFile);
};

module.exports = {
  command,
  desc,
  builder,
  handler
};
