import { buildHarRequest } from 'utils/codegenerator/har';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { getAllVariables, getTreePathFromCollectionToItem } from 'utils/collections/index';
import { interpolateHeaders, interpolateBody } from './interpolation';

// Merge headers from collection, folders, and request
const mergeHeaders = (collection, request, requestTreePath) => {
  let headers = new Map();

  // Add collection headers first
  const collectionHeaders = collection?.root?.request?.headers || [];
  collectionHeaders.forEach((header) => {
    if (header.enabled) {
      headers.set(header.name, header);
    }
  });

  // Add folder headers next, traversing from root to leaf
  if (requestTreePath && requestTreePath.length > 0) {
    for (let i of requestTreePath) {
      if (i.type === 'folder') {
        const folderHeaders = i?.root?.request?.headers || [];
        folderHeaders.forEach((header) => {
          if (header.enabled) {
            headers.set(header.name, header);
          }
        });
      }
    }
  }

  // Add request headers last (they take precedence)
  const requestHeaders = request.headers || [];
  requestHeaders.forEach((header) => {
    if (header.enabled) {
      headers.set(header.name, header);
    }
  });

  // Convert Map back to array
  return Array.from(headers.values());
};

const generateSnippet = ({ language, item, collection, shouldInterpolate = false }) => {
  try {
    // Get HTTPSnippet dynamically so mocks can be applied in tests
    const { HTTPSnippet } = require('httpsnippet');

    const variables = getAllVariables(collection, item);

    const request = item.request;

    // Get the request tree path and merge headers
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    let headers = mergeHeaders(collection, request, requestTreePath);

    // Add auth headers if needed
    if (request.auth && request.auth.mode !== 'none') {
      const collectionAuth = collection?.root?.request?.auth || null;
      const authHeaders = getAuthHeaders(collectionAuth, request.auth);
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
  generateSnippet,
  mergeHeaders
};
