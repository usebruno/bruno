const fs = require('fs');
const { buildSchema } = require('graphql');
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

  // Validate as SDL before returning
  try {
    buildSchema(fileContent);
  } catch (sdlErr) {
    throw new Error('The file does not contain a valid GraphQL schema. Please upload a JSON introspection result or SDL file.');
  }

  return fileContent;
};

module.exports = { loadGqlSchemaFile };
