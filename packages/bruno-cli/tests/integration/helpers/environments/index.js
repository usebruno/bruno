const fs = require('fs');
const path = require('path');
const { expect } = require('@jest/globals');
const { parseEnvironment } = require('@usebruno/filestore');

/**
 * @param {string} filePath - Environment file to read; its extension selects the format
 */
const readEnvironment = (filePath) =>
  parseEnvironment(fs.readFileSync(filePath, 'utf8'), { format: path.extname(filePath).slice(1) });

const variableNames = (environment) => environment.variables.map((variable) => variable.name).sort();

const findVariable = (environment, name) => environment.variables.find((variable) => variable.name === name);

/**
 * Asserted on the raw bytes: a secret can also reach disk through a field no parser surfaces.
 *
 * @param {string} value - Value that must appear in none of the files
 * @param {string[]} filePaths - Files to search
 */
const expectValueNotWritten = (value, filePaths) => {
  const carrying = filePaths.filter((filePath) => fs.readFileSync(filePath, 'utf8').includes(value));
  expect(carrying).toEqual([]);
};

module.exports = {
  readEnvironment,
  variableNames,
  findVariable,
  expectValueNotWritten
};
