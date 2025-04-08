const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const jsyaml = require('js-yaml');
const brunoConverters = require('@usebruno/converters');
const { openApiToBruno } = brunoConverters;
const { exists, createDirectory } = require('../utils/filesystem');
const { sanitizeName, safeWriteFileSync, stringifyJson } = require('../utils/common');
const { jsonToBru, envJsonToBru, jsonToCollectionBru } = require('../utils/bru');
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
      describe: 'Output directory path',
      type: 'string',
      demandOption: false
    })
    .example('$0 import -t openapi -s api.json -o my-collection', 'Import OpenAPI collection from JSON file')
    .example('$0 import -t openapi -s api.json', 'Import OpenAPI collection to desktop')
    .example('$0 import -t openapi -s api.yaml -o my-collection', 'Import OpenAPI collection from YAML file');
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

const createBrunoFiles = async (collection, outputPath) => {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputPath)) {
    await createDirectory(outputPath);
  }

  // Create bruno.json
  const brunoConfig = {
    version: '1',
    name: collection.name,
    type: 'collection',
    ignore: ['node_modules', '.git']
  };
  const brunoConfigContent = stringifyJson(brunoConfig);
  await fs.promises.writeFile(path.join(outputPath, 'bruno.json'), brunoConfigContent);

  // Create collection.bru if collection has root data
  if (collection.root) {
    const collectionBruContent = jsonToCollectionBru(collection.root);
    await fs.promises.writeFile(path.join(outputPath, 'collection.bru'), collectionBruContent);
  }

  // Create folders and files
  const createItems = async (items = [], currentPath) => {
    for (const item of items) {
      if (['http-request', 'graphql-request'].includes(item.type)) {
        let sanitizedFilename = sanitizeName(item?.filename || `${item.name}.bru`);
        const filePath = path.join(currentPath, sanitizedFilename);
        const content = jsonToBru(item);
        safeWriteFileSync(filePath, content);
      }
      if (item.type === 'folder') {
        let sanitizedFolderName = sanitizeName(item?.filename || item?.name);
        const folderPath = path.join(currentPath, sanitizedFolderName);
        fs.mkdirSync(folderPath);

        if (item?.root) {
          const folderBruFilePath = path.join(folderPath, 'folder.bru');
          const content = jsonToCollectionBru(item.root, true);
          safeWriteFileSync(folderBruFilePath, content);
        }

        if (item.items && item.items.length) {
          await createItems(item.items, folderPath);
        }
      }
    }
  };

  await createItems(collection.items, outputPath);

  // Create environments
  if (collection.environments?.length) {
    const envDirPath = path.join(outputPath, 'environments');
    if (!fs.existsSync(envDirPath)) {
      fs.mkdirSync(envDirPath);
    }

    for (const env of collection.environments) {
      let sanitizedEnvFilename = sanitizeName(`${env.name}.bru`);
      const filePath = path.join(envDirPath, sanitizedEnvFilename);
      const content = envJsonToBru(env);
      safeWriteFileSync(filePath, content);
    }
  }
};

const handler = async (argv) => {
  try {
    const { source } = argv;
    let { output } = argv;

    // Set default output path to desktop if not provided
    if (!output) {
      output = path.join(require('os').homedir(), 'Desktop', 'bruno-import-' + Date.now());
      console.log(chalk.yellow(`No output path provided. Using default path: ${output}`));
    }

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

    // Create Bruno files
    await createBrunoFiles(collection, output);

    console.log(chalk.green('Collection imported successfully!'));
    console.log(chalk.dim(`Location: ${output}`));

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