const fs = require('fs');
const path = require('path');
const { getIterationDataFormat, parseIterationData } = require('@usebruno/common/runner');

/**
 * Reads and parses a runner data file into one row of variables per iteration.
 * Throws a user-facing error for unsupported, unreadable or malformed files.
 */
const loadIterationData = async (dataFilePath) => {
  if (typeof dataFilePath !== 'string' || !dataFilePath.trim()) {
    throw new Error('No data file selected');
  }

  const fileName = path.basename(dataFilePath);
  const format = getIterationDataFormat(dataFilePath);
  if (!format) {
    throw new Error(`Unsupported data file "${fileName}". Use a .csv or .json file.`);
  }

  let content;
  try {
    content = await fs.promises.readFile(dataFilePath, 'utf8');
  } catch (error) {
    throw new Error(`Could not read data file "${fileName}": ${error.message}`);
  }

  try {
    return parseIterationData(content, format);
  } catch (error) {
    throw new Error(`${fileName}: ${error.message}`);
  }
};

const getIterationDataPreview = async (dataFilePath) => {
  const rows = await loadIterationData(dataFilePath);
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return { rowCount: rows.length, columns };
};

module.exports = {
  loadIterationData,
  getIterationDataPreview
};
