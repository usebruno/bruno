const { describe, it, expect } = require('@jest/globals');
const path = require('path');
const { spawnSync } = require('child_process');

const BRU_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

const TIMEOUT = 60_000;

/**
 * Runs the CLI with NODE_DEBUG=module, which makes Node log every module it
 * loads to stderr. That log is what tells registration apart from execution.
 *
 * Separators in the log are normalised to '/' so the assertions below read the
 * same on Windows, where the trace escapes its backslashes.
 */
const runWithModuleTrace = (args) => {
  const result = spawnSync(process.execPath, [BRU_BIN, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NODE_DEBUG: 'module' },
    timeout: TIMEOUT,
    // A full `bru run` trace runs to tens of MB; the 1MB default would truncate
    // it and quietly turn the assertions below into no-ops.
    maxBuffer: 256 * 1024 * 1024
  });

  return {
    stdout: result.stdout || '',
    moduleTrace: (result.stderr || '').replace(/\\+/g, '/')
  };
};

// yargs' .commandDir() requires every module in commands/ at registration time,
// so `bru --version` used to pull in the whole `bru run` graph - @usebruno/js,
// axios, recast, handlebars, jsonwebtoken, yup, @usebruno/converters,
// @usebruno/filestore and ohm - before printing a single line.
describe('CLI - lazy command loading', () => {
  const heavyModules = [
    ['the run command', /commands\/run\.js/],
    ['the request runner', /run-single-request/],
    ['the scripting runtime', /@usebruno\/js/]
  ];

  describe('bru --version', () => {
    it('prints the version', () => {
      const { stdout } = runWithModuleTrace(['--version']);

      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    }, TIMEOUT);

    it.each(heavyModules)('does not load %s', (_label, pattern) => {
      const { moduleTrace } = runWithModuleTrace(['--version']);

      expect(moduleTrace).not.toMatch(pattern);
    }, TIMEOUT);
  });

  describe('bru --help', () => {
    it('still lists every command', () => {
      const { stdout } = runWithModuleTrace(['--help']);

      expect(stdout).toContain('run [paths...]');
      expect(stdout).toContain('import <type>');
      expect(stdout).toContain('docs <command>');
    }, TIMEOUT);

    it.each(heavyModules)('does not load %s', (_label, pattern) => {
      const { moduleTrace } = runWithModuleTrace(['--help']);

      expect(moduleTrace).not.toMatch(pattern);
    }, TIMEOUT);
  });

  // The other half of the contract: deferring the require must not stop the
  // command from loading once it is actually selected.
  describe('bru run --help', () => {
    it('loads the run command', () => {
      const { stdout, moduleTrace } = runWithModuleTrace(['run', '--help']);

      expect(moduleTrace).toMatch(/commands\/run\.js/);
      expect(stdout).toContain('Run one or more requests/folders');
    }, TIMEOUT);
  });
});
