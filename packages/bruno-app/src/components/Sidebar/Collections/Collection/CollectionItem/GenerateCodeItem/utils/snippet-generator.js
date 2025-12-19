import { buildHarRequest } from 'utils/codegenerator/har';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { getAllVariables, getTreePathFromCollectionToItem, mergeHeaders } from 'utils/collections';
import { interpolateObject } from './interpolation';
import { get } from 'lodash';

const generateSnippet = ({ language, item, collection, shouldInterpolate = false }) => {
  try {
    // Get HTTPSnippet dynamically so mocks can be applied in tests
    const { HTTPSnippet } = require('httpsnippet');

    const variables = getAllVariables(collection, item);

    let request = item.request;

    // Get the request tree path and merge headers
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    let headers = mergeHeaders(collection, request, requestTreePath);

    if (shouldInterpolate) {
      request = interpolateObject(request, variables);
    }

    // Add auth headers if needed
    if (request.auth && request.auth.mode !== 'none') {
      const collectionAuth = collection?.draft?.root ? get(collection, 'draft.root.request.auth', null) : get(collection, 'root.request.auth', null);
      const authHeaders = getAuthHeaders(collectionAuth, request.auth);
      headers = [...headers, ...authHeaders];
    }

    // Build HAR request
    const harRequest = buildHarRequest({
      request,
      headers
    });

    // Generate snippet using HTTPSnippet
    const snippet = new HTTPSnippet(harRequest);

    return snippet.convert(language.target, language.client);
  } catch (error) {
    console.error('Error generating code snippet:', error);
    return 'Error generating code snippet';
  }
};

export {
  generateSnippet
};
