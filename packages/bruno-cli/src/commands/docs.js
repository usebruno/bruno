const generate = require('./docs/generate');

const { command, desc } = require('./manifest').docs;

const builder = (yargs) => {
  return yargs.command(generate).demandCommand(1, 'Please specify a docs command, e.g. "generate"');
};

module.exports = { command, desc, builder };
