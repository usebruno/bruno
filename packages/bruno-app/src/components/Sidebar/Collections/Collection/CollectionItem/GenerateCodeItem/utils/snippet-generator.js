import { buildHarRequest } from 'utils/codegenerator/har';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { getAllVariables, getTreePathFromCollectionToItem, mergeHeaders } from 'utils/collections/index';
import { interpolateHeaders, interpolateBody } from './interpolation';
import { get } from 'lodash';

const generateSnippet = ({ language, item, collection, shouldInterpolate = false }) => {
  try {
    // Get HTTPSnippet dynamically so mocks can be applied in tests
    const { HTTPSnippet } = require('httpsnippet');

    const variables = getAllVariables(collection, item);

    const request = item.request;

    // Get the request tree path and merge headers
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    let headers = mergeHeaders(collection, request, requestTreePath);

    // Use the final resolved auth on the request (auth should already be resolved
    // by GenerateCodeItem). Defensive fallback: if auth.mode === 'inherit',
    // attempt to use collection auth.
    const resolvedAuth = request.auth;
    if (resolvedAuth && resolvedAuth.mode && resolvedAuth.mode !== 'none' && resolvedAuth.mode !== 'inherit') {
      // getAuthHeaders should accept resolved auth directly
      const authHeaders = getAuthHeaders(resolvedAuth, request);
      headers = [...headers, ...authHeaders];
    } else if (resolvedAuth && resolvedAuth.mode === 'inherit') {
      // Fallback: if auth is still 'inherit', try collection auth
      const collectionAuth = collection?.draft?.root ? get(collection, 'draft.root.request.auth', null) : get(collection, 'root.request.auth', null);
      if (collectionAuth && collectionAuth.mode !== 'none') {
        const authHeaders = getAuthHeaders(collectionAuth, request);
        headers = [...headers, ...authHeaders];
      }
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
