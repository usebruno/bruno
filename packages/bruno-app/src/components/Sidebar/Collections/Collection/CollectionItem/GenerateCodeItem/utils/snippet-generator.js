import { buildHarRequest } from 'utils/codegenerator/har';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { getAllVariables, getTreePathFromCollectionToItem, mergeHeaders } from 'utils/collections/index';
import { interpolateAuth, interpolateHeaders, interpolateBody, interpolateParams } from './interpolation';

const generateSnippet = ({ language, item, collection, shouldInterpolate = false }) => {
  try {
    // Get HTTPSnippet dynamically so mocks can be applied in tests
    const { HTTPSnippet } = require('httpsnippet');

    const variables = getAllVariables(collection, item);
    const request = item.request;

    // Get the request tree path and merge headers
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    let headers = mergeHeaders(collection, request, requestTreePath);

    // Add auth headers if needed (auth inheritance is resolved upstream)
    if (request.auth && request.auth.mode !== 'none') {
      if (shouldInterpolate) {
        request.auth = interpolateAuth(request.auth, variables);
      }

      const authHeaders = getAuthHeaders(request.auth, collection, item);
      headers = [...headers, ...authHeaders];
    }

    // Interpolate headers, body and params if needed
    if (shouldInterpolate) {
      headers = interpolateHeaders(headers, variables);
      request.body = interpolateBody(request.body, variables);
      request.params = interpolateParams(request.params, variables);
    } else {
      request.url = finalizeUrl(request.url);
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

const finalizeUrl = (str) => {
  try {
    if (typeof str !== 'string') return str;

    let result = str.trim();

    // If it starts with {{domain}}, prepend https://
    if (!/^https?:\/\//i.test(result)) {
      result = 'https://' + result;
    }

    // Encode placeholders first ({{domain}} -> %7B%7Bdomain%7D%7D)
    result = result.replace(/\{\{([^}]+)\}\}/g, (match) => encodeURIComponent(match));

    // handles spaces, single quotes, and literal percent signs
    result = result
      .replace(/ /g, '%20') // Space -> %20
      .replace(/'/g, '%27') // ' -> %27
      .replace(/%(?![0-9a-fA-F]{2})/g, '%25'); // Literal % -> %25

    return result;
  } catch (error) {
    console.log({ error });
  }
};

export {
  generateSnippet
};
