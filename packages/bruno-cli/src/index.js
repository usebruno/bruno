const yargs = require('yargs');
const chalk = require('chalk');
const { initializeShellEnv } = require('@usebruno/requests');

const { CLI_EPILOGUE, CLI_VERSION } = require('./constants');
const { COMMANDS } = require('./command-registry');

const printBanner = () => {
  console.log(chalk.yellow(`Bru CLI ${CLI_VERSION}`));
};

/**
 * Each command module is required inside its builder and handler, so it loads only when that command
 * is actually invoked. `commands/run.js` pulls in the whole execution runtime — bruno-js, axios,
 * recast, handlebars, jsonwebtoken, filestore, ohm — which `bru --version` and `bru --help` would
 * otherwise load just to print one line.
 */
const registerCommands = (yargsInstance) => {
  for (const { name, command, desc } of COMMANDS) {
    const load = () => require(`./commands/${name}`);

    // Forward every argument: yargs passes a second value to the builder, and the module's own
    // builder/handler signatures should stay authoritative rather than being narrowed here.
    yargsInstance.command(
      command,
      desc,
      (...args) => load().builder(...args),
      (...args) => load().handler(...args)
    );
  }

  return yargsInstance;
};

const run = async () => {
  // Fetch shell environment (useful when CLI is run as subprocess from GUI app or cron)
  await initializeShellEnv();

  const argLength = process.argv.length;
  const commandsToPrintBanner = ['--help', '-h'];

  if (argLength <= 2 || process.argv.find((arg) => commandsToPrintBanner.includes(arg))) {
    printBanner();
  }

  const { argv } = registerCommands(yargs.strict())
    .epilogue(CLI_EPILOGUE)
    .usage('Usage: $0 <command> [options]')
    .demandCommand(1, 'Woof!! Let\'s play with some APIs!!')
    .help('h')
    .alias('h', 'help');
};

module.exports = {
  run
};
