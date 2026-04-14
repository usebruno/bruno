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
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('The file does not contain valid JSON. Please upload a valid GraphQL schema file (JSON introspection result or SDL).');
  }
  return parsed;
};

module.exports = { loadGqlSchemaFile };
