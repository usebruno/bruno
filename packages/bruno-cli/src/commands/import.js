const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const jsyaml = require('js-yaml');
const brunoConverters = require('@usebruno/converters');
const { openApiToBruno } = brunoConverters;
const { exists } = require('../utils/filesystem');
const { stringifyJson } = require('../utils/common');
const constants = require('../constants');

const command = 'import';
const desc = 'Import a collection from another format';

const builder = (yargs) => {
  return yargs
    .option('t', {
      alias: 'type',
      describe: 'Type of collection to import',
      type: 'string',
      choices: ['openapi'],
      demandOption: true
    })
    .option('s', {
      alias: 'source',
      describe: 'Source file path',
      type: 'string',
      demandOption: true
    })
    .option('o', {
      alias: 'output',
      describe: 'Output file path (if not specified, outputs to desktop)',
      type: 'string',
      demandOption: false
    })
    .example('$0 import -t openapi -s api.json', 'Import OpenAPI collection and output JSON to desktop')
    .example('$0 import -t openapi -s api.json -o collection.json', 'Import OpenAPI collection and save JSON to file')
    .example('$0 import -t openapi -s api.yaml -o collection.json', 'Import OpenAPI collection from YAML file');
};

const readFileContent = async (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      // Try parsing as JSON first
      return JSON.parse(content);
    } catch (jsonError) {
      // If JSON parsing fails, try YAML
      try {
        return jsyaml.load(content);
      } catch (yamlError) {
        throw new Error('Failed to parse file as JSON or YAML');
      }
    }
  } catch (error) {
    throw new Error(`Error reading file: ${error.message}`);
  }
};

const handler = async (argv) => {
  try {
    const { source, output } = argv;

    // Validate source file exists
    const sourceExists = await exists(source);
    if (!sourceExists) {
      console.error(chalk.red(`Source file "${source}" does not exist`));
      process.exit(constants.EXIT_STATUS.ERROR_FILE_NOT_FOUND);
    }

    // Read and parse the source
    const sourceData = await readFileContent(source);

    // Convert to Bruno format
    console.log(chalk.yellow('Converting to Bruno format...'));
    const collection = await openApiToBruno(sourceData);

    const collectionJson = stringifyJson(collection);

    if (output) {
      // Write to file with provided path
      fs.writeFileSync(output, collectionJson);
      console.log(chalk.green('Collection JSON saved successfully!'));
      console.log(chalk.dim(`Location: ${output}`));
    } else {
      // Default to desktop if no output path provided
      const desktopPath = path.join(require('os').homedir(), 'Desktop');
      const fileName = `bruno-collection-${Date.now()}.json`;
      const defaultPath = path.join(desktopPath, fileName);
      
      fs.writeFileSync(defaultPath, collectionJson);
      console.log(chalk.green('Collection JSON saved successfully!'));
      console.log(chalk.dim(`Location: ${defaultPath}`));
    }

  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(constants.EXIT_STATUS.ERROR_GENERIC);
  }
};

module.exports = {
  command,
  desc,
  builder,
  handler
}; 