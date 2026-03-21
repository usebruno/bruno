const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { brunoToPostman } = require('@usebruno/converters');
const { createCollectionJsonFromPathname } = require('../utils/collection');
const constants = require('../constants');

const command = 'export <format>';
const desc = 'Export a Bruno collection to other formats';

const builder = (yargs) => {
  yargs
    .positional('format', {
      describe: 'Format to export to',
      type: 'string',
      choices: ['postman']
    })
    .option('collection', {
      alias: 'c',
      describe: 'Path to the Bruno collection directory',
      type: 'string',
      demandOption: true
    })
    .option('output', {
      alias: 'o',
      describe: 'Path to the output file',
      type: 'string',
      demandOption: true
    })
    .example('$0 export postman --collection ./my-collection --output ./collection.postman.json')
    .example('$0 export postman -c ./my-collection -o ./collection.postman.json');
};

const cleanItems = (items) => {
  return items.map((item) => {
    if (item.type === 'folder') {
      return { ...item, items: cleanItems(item.items) };
    } else if (['http-request', 'graphql-request'].includes(item.type)) {
      const cleaned = { ...item };
      delete cleaned.items;
      return cleaned;
    }
    return item;
  });
};

const handler = async (argv) => {
  try {
    const { format, collection, output } = argv;

    if (!format || format !== 'postman') {
      console.error(chalk.red('Only Postman export is supported currently'));
      process.exit(constants.EXIT_STATUS.ERROR_GENERIC);
    }

    const collectionPath = path.resolve(collection);

    if (!fs.existsSync(collectionPath)) {
      console.error(chalk.red(`Collection path does not exist: ${collectionPath}`));
      process.exit(constants.EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
    }

    console.log(chalk.yellow('Loading Bruno collection...'));
    const brunoCollection = createCollectionJsonFromPathname(collectionPath);

    // Clean up items - remove empty items array from requests
    brunoCollection.items = cleanItems(brunoCollection.items);

    console.log(chalk.yellow('Converting to Postman format...'));
    const postmanCollection = brunoToPostman(brunoCollection);

    const outputPath = path.resolve(output);
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      console.error(chalk.red(`Output directory does not exist: ${outputDir}`));
      process.exit(constants.EXIT_STATUS.ERROR_MISSING_OUTPUT_DIR);
    }

    console.log(chalk.yellow('Writing Postman collection...'));
    fs.writeFileSync(outputPath, JSON.stringify(postmanCollection, null, 2));

    console.log(chalk.green(`✓ Successfully exported to: ${outputPath}`));
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(constants.EXIT_STATUS.ERROR_GENERIC);
  }
};

module.exports = {
  command,
  desc,
  builder,
  handler,
  cleanItems
};
