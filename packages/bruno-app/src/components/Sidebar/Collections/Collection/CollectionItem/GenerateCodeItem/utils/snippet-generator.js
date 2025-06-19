const { buildHarRequest } = require('utils/codegenerator/har');
const { getAuthHeaders } = require('utils/codegenerator/auth');
const { getAllVariables } = require('utils/collections/index');
const { interpolateHeaders, interpolateBody, createVariablesObject } = require('./interpolation');
const { resolveInheritedAuth } = require('./auth-utils');

const generateSnippet = ({ language, item, collection, shouldInterpolate = false }) => {
  try {
    // Get HTTPSnippet dynamically so mocks can be applied in tests
    const { HTTPSnippet } = require('httpsnippet');
    
    // Get all variables for interpolation
    const allVariables = getAllVariables(collection);
    
    // Create variables object for interpolation
    const variables = createVariablesObject({
      globalEnvironmentVariables: collection.globalEnvironmentVariables || {},
      collectionVars: collection.collectionVars || {},
      allVariables,
      collection,
      runtimeVariables: collection.runtimeVariables || {},
      processEnvVars: collection.processEnvVariables || {}
    });

    // Get the request with resolved auth
    const request = resolveInheritedAuth(item, collection);
    
    // Prepare headers
    let headers = [...(request.headers || [])];
    
    // Add auth headers if needed
    if (request.auth && request.auth.mode !== 'none') {
      const authHeaders = getAuthHeaders(request.auth, variables);
      headers = [...headers, ...authHeaders];
    }

    // Interpolate headers and body if needed
    if (shouldInterpolate) {
      headers = interpolateHeaders(headers, variables);
      if (request.body) {
        request.body = interpolateBody(request.body, variables);
      }
    }

    // Build HAR request
    const harRequest = buildHarRequest({
      request,
      headers
    });

    // Generate snippet using HTTPSnippet
    const snippet = new HTTPSnippet(harRequest);
    const result = snippet.convert(language.target, language.client);

    return result;
  } catch (error) {
    console.error('Error generating code snippet:', error);
    return 'Error generating code snippet';
  }
};

module.exports = {
  generateSnippet
}; 