const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { migrateCollection, formatCollectionReport, getCurrentVersion } = require('@usebruno/converters');
const { exists, isDirectory } = require('../utils/filesystem');
const constants = require('../constants');

const command = 'migrate [collection]';
const desc = 'Migrate collection scripts from deprecated APIs to the latest version';

const builder = (yargs) => {
  yargs
    .positional('collection', {
      describe: 'Path to the collection directory (defaults to current directory)',
      type: 'string',
      default: '.'
    })
    .option('from', {
      describe: 'Source API version to migrate from',
      type: 'string',
      default: '1'
    })
    .option('to', {
      describe: 'Target API version to migrate to (defaults to latest)',
      type: 'string'
    })
    .option('dry-run', {
      describe: 'Show what would change without modifying files',
      type: 'boolean',
      default: false
    })
    .example('$0 migrate', 'Migrate scripts in current collection to latest API version')
    .example('$0 migrate ./my-collection', 'Migrate scripts in a specific collection')
    .example('$0 migrate --dry-run', 'Preview changes without modifying files')
    .example('$0 migrate --from 1 --to 2', 'Migrate from version 1 to version 2');
};

const handler = async (argv) => {
  try {
    const { collection, from, to, dryRun } = argv;
    const collectionPath = path.resolve(collection);

    // Validate collection path
    if (!await exists(collectionPath)) {
      console.error(chalk.red(`Directory does not exist: ${collectionPath}`));
      process.exit(constants.EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
    }

    if (!isDirectory(collectionPath)) {
      console.error(chalk.red(`Not a directory: ${collectionPath}`));
      process.exit(constants.EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
    }

    // Check for collection markers
    const hasBrunoJson = fs.existsSync(path.join(collectionPath, 'bruno.json'));
    const hasOpenCollection = fs.existsSync(path.join(collectionPath, 'opencollection.yml'));
    if (!hasBrunoJson && !hasOpenCollection) {
      console.error(chalk.red('Not a Bruno collection directory (no bruno.json or opencollection.yml found)'));
      process.exit(constants.EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
    }

    const toVersion = to || getCurrentVersion();

    if (dryRun) {
      console.log(chalk.yellow('Dry run mode — no files will be modified\n'));
    }

    console.log(chalk.yellow(`Migrating scripts from API v${from} to v${toVersion}...`));
    console.log(chalk.dim(`Collection: ${collectionPath}\n`));

    const results = migrateCollection(collectionPath, from, toVersion, { dryRun });

    // Print report
    console.log(formatCollectionReport(results));
    console.log('');

    if (results.summary.totalChanges === 0) {
      console.log(chalk.green('No deprecated APIs found. Your scripts are up to date.'));
    } else if (dryRun) {
      console.log(chalk.yellow(`${results.summary.totalChanges} deprecated API call(s) found in ${results.summary.filesChanged} file(s).`));
      console.log(chalk.yellow('Run without --dry-run to apply changes.'));
    } else {
      console.log(chalk.green(`Migrated ${results.summary.totalChanges} API call(s) in ${results.summary.filesChanged} file(s).`));
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
