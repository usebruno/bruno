import { buildHarRequest } from 'utils/codegenerator/har';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { getAllVariables, getActiveProcessEnvVars } from 'utils/collections/index';
import { interpolateHeaders, interpolateBody, createVariablesObject } from './interpolation';

const generateSnippet = ({ language, item, collection, shouldInterpolate = false }) => {
  try {
    // Get HTTPSnippet dynamically so mocks can be applied in tests
    const { HTTPSnippet } = require('httpsnippet');

    const allVariables = getAllVariables(collection, item);

    const activeProcessEnvVars = getActiveProcessEnvVars(collection);

    // Create variables object for interpolation
    const variables = createVariablesObject({
      globalEnvironmentVariables: collection.globalEnvironmentVariables || {},
      collectionVars: collection.collectionVars || {},
      allVariables,
      collection,
      runtimeVariables: collection.runtimeVariables || {},
      processEnvVars: activeProcessEnvVars
    });

    const request = item.request;

    // Prepare headers
    let headers = [...(request.headers || [])];

    // Add auth headers if needed
    if (request.auth && request.auth.mode !== 'none') {
      const authHeaders = getAuthHeaders(collection.root.request.auth, request.auth);
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

export {
  generateSnippet
};