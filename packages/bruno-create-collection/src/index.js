const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');
const packageJson = require('../package.json');

// Error handling for unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Unhandled error:'));
  console.error(chalk.red(error.message));
  process.exit(1);
});

const run = () => {
  /* Configure and run CLI
   * hideBin removes the first two elements from process.argv:
   * [0] = node executable path
   * [1] = script path
   * This lets yargs process only the actual CLI arguments
   */
  yargs(hideBin(process.argv))
    .strict()
    .commandDir('commands')
    .version(packageJson.version)
    .help()
    .argv;
};

module.exports = {
  run
};