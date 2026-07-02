'use strict';
/**
 * packages/bruno-cli/src/commands/docs.js
 *
 * Registers the `bru docs` sub-command group using yargs' commandDir pattern.
 * Yargs auto-discovers sub-commands from the ./docs/ directory.
 *
 * Usage:
 *   bru docs generate <collection-path> [options]
 */

exports.command = 'docs <subcommand>';
exports.describe = 'Generate documentation from a Bruno collection';

exports.builder = (yargs) => {
  return yargs.commandDir('docs').demandCommand(1, 'Please specify a docs subcommand (e.g. generate)');
};

// The handler is never called directly — yargs routes to the sub-command.
exports.handler = () => {};
