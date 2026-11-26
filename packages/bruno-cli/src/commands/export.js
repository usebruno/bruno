const openapi = require('./export/openapi');

const command = 'export <format>';
const desc = 'Export a collection to another format';

const builder = (yargs) => {
  return yargs.command(openapi).demandCommand(1, 'Please specify an export format, e.g. "openapi"');
};

module.exports = { command, desc, builder };
