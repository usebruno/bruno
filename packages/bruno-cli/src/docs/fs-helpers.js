'use strict';
/**
 * packages/bruno-cli/src/docs/fs-helpers.js
 *
 * Thin filesystem helpers for the docs command.
 * Kept separate so they can be unit-tested in isolation.
 */

const fs = require('fs');
const path = require('path');

/**
 * Throws a descriptive Error if `dir` is not a valid Bruno collection root.
 * A valid root contains either opencollection.yml (v3+) or bruno.json (.bru).
 *
 * @param {string} dir  Absolute path
 * @throws {Error}
 */
function assertCollectionRoot(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Collection path does not exist: ${dir}`);
  }

  const stat = fs.lstatSync(dir);
  if (!stat.isDirectory()) {
    throw new Error(`Collection path is not a directory: ${dir}`);
  }

  const hasOpenCollection = fs.existsSync(path.join(dir, 'opencollection.yml'));
  const hasBruJson = fs.existsSync(path.join(dir, 'bruno.json'));

  if (!hasOpenCollection && !hasBruJson) {
    throw new Error(
      `Not a Bruno collection: ${dir}\n`
      + `  Expected to find "opencollection.yml" (OpenCollection format) `
      + `or "bruno.json" (.bru format).`
    );
  }
}

/**
 * Resolves the output path.
 * If the value is relative it is resolved against process.cwd().
 *
 * @param {string} outputArg  Value of --output (may be relative or absolute)
 * @returns {string}          Absolute path
 */
function resolveOutput(outputArg) {
  return path.resolve(outputArg);
}

/**
 * Creates `dir` (and any parent directories) if it does not exist.
 * No-op if it already exists.
 *
 * @param {string} dir
 * @throws {Error} If creation fails
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = { assertCollectionRoot, resolveOutput, ensureDir };
