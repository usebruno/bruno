/**
 * The commands yargs registers, and how each one is spelled on the command line.
 *
 * `command` and `desc` are written out here rather than read from the command modules, because
 * requiring a module to read them would load it at startup — which is exactly what registering
 * lazily avoids. tests/commands.spec.js asserts these stay in step with the modules.
 *
 * Alphabetical, so `bru --help` lists commands in a stable order.
 */
const COMMANDS = [
  { name: 'import', command: 'import <type>', desc: 'Import a collection from other formats' },
  { name: 'run', command: 'run [paths...]', desc: 'Run one or more requests/folders' }
];

module.exports = {
  COMMANDS
};
