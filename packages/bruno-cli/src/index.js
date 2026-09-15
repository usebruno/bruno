const yargs = require('yargs');
const chalk = require('chalk');
const { initializeShellEnv } = require('@usebruno/requests');

const { CLI_EPILOGUE, CLI_VERSION } = require('./constants');
const commandManifest = require('./commands/manifest');

/**
 * Registers a command from its manifest entry, deferring the require until the
 * command is actually selected.
 *
 * yargs' `.commandDir()` requires every module in the directory at registration
 * time, so `commands/run.js` - and through it @usebruno/js, axios, recast,
 * handlebars, jsonwebtoken, yup, @usebruno/converters, @usebruno/filestore and
 * ohm - was loaded even for `bru --version`.
 */
const lazyCommand = (name, load) => ({
  ...commandManifest[name],
  builder: (yargs) => load().builder(yargs),
  /**
   * `docs` has no handler of its own; its builder demands a subcommand. Mirror
   * yargs' own no-op default rather than calling undefined.
   */
  handler: (argv) => load().handler?.(argv)
});

const printBanner = () => {
  console.log(chalk.yellow(`Bru CLI ${CLI_VERSION}`));
};

const run = async () => {
  // Fetch shell environment (useful when CLI is run as subprocess from GUI app or cron)
  await initializeShellEnv();

  const argLength = process.argv.length;
  const commandsToPrintBanner = ['--help', '-h'];

  if (argLength <= 2 || process.argv.find((arg) => commandsToPrintBanner.includes(arg))) {
    printBanner();
  }

  const { argv } = yargs
    .strict()
    // Registered in the order .commandDir() used to walk the directory, so
    // `bru --help` lists them exactly as before.
    .command(lazyCommand('docs', () => require('./commands/docs')))
    .command(lazyCommand('import', () => require('./commands/import')))
    .command(lazyCommand('run', () => require('./commands/run')))
    .epilogue(CLI_EPILOGUE)
    .usage('Usage: $0 <command> [options]')
    .demandCommand(1, 'Woof!! Let\'s play with some APIs!!')
    .help('h')
    .alias('h', 'help');
};

module.exports = {
  run
};
