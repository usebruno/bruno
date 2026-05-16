const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const constants = require('../constants');
const { createCollectionJsonFromPathname } = require('../utils/collection');
const { loadOpenApiSpec } = require('../sync/source-loader');
const { computeDrift } = require('../sync/diff-engine');
const { applyFixes } = require('../sync/fix-engine');
const { formatTextReport, formatJsonReport } = require('../sync/report-formatter');

const command = 'sync';
const desc = 'Check or fix drift between an OpenAPI spec and the collection';

const builder = (yargs) => {
  yargs
    .option('source', {
      alias: 's',
      describe: 'Path or URL to OpenAPI spec',
      type: 'string',
      demandOption: true
    })
    .option('check', {
      describe: 'Check mode: report drift and exit non-zero if out of sync (default)',
      type: 'boolean',
      default: false
    })
    .option('fix', {
      describe: 'Fix mode: scaffold missing requests, update modified ones',
      type: 'boolean',
      default: false
    })
    .option('dry-run', {
      describe: 'Show what --fix would do without writing files',
      type: 'boolean',
      default: false
    })
    .option('remove-stale', {
      describe: 'Delete collection files not in spec (requires --fix)',
      type: 'boolean',
      default: false
    })
    .option('format', {
      alias: 'f',
      describe: 'Output format',
      type: 'string',
      choices: ['text', 'json'],
      default: 'text'
    })
    .option('output', {
      alias: 'o',
      describe: 'Write report to file instead of stdout',
      type: 'string'
    })
    .option('group-by', {
      alias: 'g',
      describe: 'How to group spec requests',
      type: 'string',
      choices: ['tags', 'path'],
      default: 'tags'
    })
    .option('insecure', {
      describe: 'Skip SSL certificate verification when fetching from URLs',
      type: 'boolean',
      default: false
    })
    .example('$0 sync --source api.yml', 'Check drift against an OpenAPI spec')
    .example('$0 sync -s https://api.example.com/spec.json --format json', 'Check drift with JSON output')
    .example('$0 sync -s api.yml --fix', 'Fix drift: scaffold missing, update modified')
    .example('$0 sync -s api.yml --fix --dry-run', 'Preview what fix would change')
    .example('$0 sync -s api.yml --fix --remove-stale', 'Fix drift and delete stale requests');
};

const handler = async (argv) => {
  try {
    const { source, check, fix, dryRun, removeStale, format, output, groupBy, insecure } = argv;

    if (check && fix) {
      console.error(chalk.red('--check and --fix are mutually exclusive'));
      process.exit(1);
    }

    // Default to check mode if neither --check nor --fix is specified
    const mode = fix ? 'fix' : 'check';

    if (removeStale && !fix) {
      console.error(chalk.red('--remove-stale requires --fix'));
      process.exit(1);
    }

    if (dryRun && !fix) {
      console.error(chalk.red('--dry-run requires --fix'));
      process.exit(1);
    }

    // Load the OpenAPI spec
    let spec, specInfo;
    try {
      const result = await loadOpenApiSpec(source, { insecure });
      spec = result.spec;
      specInfo = result.specInfo;
    } catch (err) {
      console.error(chalk.red(`Failed to load spec: ${err.message}`));
      process.exit(constants.EXIT_STATUS.ERROR_INVALID_SPEC);
    }

    // Load the Bruno collection from the current directory
    const collectionPath = process.cwd();
    const collection = createCollectionJsonFromPathname(collectionPath);

    // Compute drift
    const driftReport = computeDrift(spec, collection, { groupBy });

    if (mode === 'check') {
      // Format and output the report
      const formatted = format === 'json'
        ? formatJsonReport(driftReport, specInfo, source)
        : formatTextReport(driftReport, specInfo, source);

      if (output) {
        fs.writeFileSync(path.resolve(output), formatted, 'utf8');
        console.log(chalk.green(`Report written to ${output}`));
      } else {
        console.log(formatted);
      }

      // Exit with appropriate code
      const hasDrift = driftReport.summary.missing > 0
        || driftReport.summary.stale > 0
        || driftReport.summary.modified > 0;

      if (hasDrift) {
        process.exit(constants.EXIT_STATUS.ERROR_DRIFT_DETECTED);
      }
    } else if (mode === 'fix') {
      // Show drift summary first
      if (format === 'text') {
        const formatted = formatTextReport(driftReport, specInfo, source);
        console.log(formatted);
        console.log('');
      }

      const hasDrift = driftReport.summary.missing > 0
        || driftReport.summary.stale > 0
        || driftReport.summary.modified > 0;

      if (!hasDrift) {
        console.log(chalk.green('Collection is already in sync. Nothing to fix.'));
        return;
      }

      if (dryRun) {
        console.log(chalk.bold('Dry run — no files will be written:'));
        console.log('');
      } else {
        console.log(chalk.bold('Applying fixes...'));
        console.log('');
      }

      const results = await applyFixes(spec, collection, driftReport, {
        dryRun,
        removeStale,
        groupBy,
        format: collection.format
      });

      // Print results
      if (results.created.length > 0) {
        console.log(chalk.green(`Created ${results.created.length} request(s)`));
      }
      if (results.updated.length > 0) {
        console.log(chalk.cyan(`Updated ${results.updated.length} request(s)`));
      }
      if (results.removed.length > 0) {
        console.log(chalk.red(`Removed ${results.removed.length} request(s)`));
      }
      if (results.errors.length > 0) {
        console.log(chalk.red(`${results.errors.length} error(s):`));
        for (const err of results.errors) {
          console.log(chalk.red(`  ${err.method} ${err.path}: ${err.error}`));
        }
      }

      // Warn about stale endpoints if not removing
      if (!removeStale && driftReport.stale.length > 0) {
        console.log('');
        console.log(chalk.yellow(`Stale endpoints (not in spec, NOT deleted):`));
        for (const item of driftReport.stale) {
          console.log(chalk.yellow(`  ! ${item.method.padEnd(7)} ${item.path}`));
        }
        console.log(chalk.dim('  Use --remove-stale to delete these files.'));
      }

      if (results.errors.length > 0) {
        process.exit(constants.EXIT_STATUS.ERROR_SYNC_FAILED);
      }
    }
  } catch (err) {
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(constants.EXIT_STATUS.ERROR_GENERIC);
  }
};

module.exports = {
  command,
  desc,
  builder,
  handler
};
