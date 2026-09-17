const generate = require('./docs/generate');

const command = 'docs <command>';
const desc = 'Generate documentation for your collection';

const builder = (yargs) => {
  return yargs.command(generate).demandCommand(1, 'Please specify a docs command, e.g. "generate"');
};

module.exports = { command, desc, builder };
