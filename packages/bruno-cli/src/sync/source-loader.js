const { readOpenApiFile, isUrl } = require('../commands/import');
const { isValidOpenApiSpec } = require('@usebruno/common/sync');
const jsyaml = require('js-yaml');

/**
 * Load and validate an OpenAPI spec from a file path or URL.
 * Returns { spec, specInfo } on success.
 * Throws on failure.
 */
const loadOpenApiSpec = async (source, options = {}) => {
  let content = await readOpenApiFile(source, options);

  // readOpenApiFile may return a string for YAML content
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch {
      content = jsyaml.load(content);
    }
  }

  if (!isValidOpenApiSpec(content)) {
    if (content?.swagger) {
      throw new Error('Swagger 2.0 is not supported. Please convert to OpenAPI 3.x first.');
    }
    throw new Error('Invalid OpenAPI specification. Expected a valid OpenAPI 3.x document with paths.');
  }

  const specInfo = {
    title: content.info?.title || 'Untitled API',
    version: content.info?.version || ''
  };

  return { spec: content, specInfo };
};

module.exports = {
  loadOpenApiSpec,
  isUrl
};
