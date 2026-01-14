import { buildHarRequest } from 'utils/codegenerator/har';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { getAllVariables, getTreePathFromCollectionToItem, mergeHeaders } from 'utils/collections/index';
import { interpolateAuth, interpolateHeaders, interpolateBody, interpolateParams } from './interpolation';
import { get, cloneDeep } from 'lodash';

const generateSnippet = ({ language, item, collection, shouldInterpolate = false }) => {
  try {
    // Get HTTPSnippet dynamically so mocks can be applied in tests
    const { HTTPSnippet } = require('httpsnippet');

    const variables = getAllVariables(collection, item);
    const request = cloneDeep(item.request);

    // Get the request tree path and merge headers
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    let headers = mergeHeaders(collection, request, requestTreePath);

    // Add auth headers if needed
    if (request.auth && request.auth.mode !== 'none') {
      let collectionAuth = collection?.draft?.root ? get(collection, 'draft.root.request.auth', null) : get(collection, 'root.request.auth', null);

      // Interpolate collectionAuth if it will be used (when auth mode is inherit)
      if (shouldInterpolate && collectionAuth && request.auth.mode === 'inherit') {
        collectionAuth = interpolateAuth(collectionAuth, variables);
      }

      const authHeaders = getAuthHeaders(collectionAuth, request.auth);
      headers = [...headers, ...authHeaders];
    }

    // Interpolate headers, body and params if needed
    if (shouldInterpolate) {
      headers = interpolateHeaders(headers, variables);
      request.body = interpolateBody(request.body, variables);
      request.params = interpolateParams(request.params, variables);
    }

    // Build HAR request
    const harRequest = buildHarRequest({ request, headers });

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
