const fs = require('fs');
const { safeParseJSON } = require('./common');

const loadGqlSchemaFile = (filePath) => {
  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } catch (readErr) {
    throw new Error(`Unable to read file: ${readErr.message}`);
  }

  const parsed = safeParseJSON(fileContent);
  if (typeof parsed === 'object' && parsed !== null) {
    return parsed;
  }

  return fileContent;
};

module.exports = { loadGqlSchemaFile };
