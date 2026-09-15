/**
 * Command metadata, deliberately free of any require.
 *
 * `src/index.js` needs a command's name and description to register it, but
 * not its implementation. Keeping the two apart is what lets `bru --version`
 * and `bru --help` return without loading the `bru run` graph.
 */
const commands = {
  run: {
    command: 'run [paths...]',
    desc: 'Run one or more requests/folders'
  },
  import: {
    command: 'import <type>',
    desc: 'Import a collection from other formats'
  },
  docs: {
    command: 'docs <command>',
    desc: 'Generate documentation for your collection'
  }
};

module.exports = commands;
