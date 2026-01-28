import { buildHarRequest, BRUNO_PERCENT_SENTINEL } from 'utils/codegenerator/har';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { getAllVariables, getTreePathFromCollectionToItem, mergeHeaders } from 'utils/collections/index';
import { interpolateAuth, interpolateHeaders, interpolateBody, interpolateParams } from './interpolation';
import { get } from 'lodash';

// Must match har.js placeholders so {{ variable }} is restored in generated code
const BRUNO_VAR_PLACEHOLDER_PREFIX = '__BRUNO_VAR__';
const BRUNO_VAR_PLACEHOLDER_SUFFIX = '__';

const generateSnippet = ({ language, item, collection, shouldInterpolate = false }) => {
  try {
    const { HTTPSnippet } = require('httpsnippet');
    const variables = getAllVariables(collection, item);
    const url = get(item, 'draft.request.url') ?? get(item, 'request.url') ?? '';

    let request = { ...item.request, url };

    // 1. Resolve Auth & Merge Headers
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    const collectionAuth = collection?.draft?.root
      ? get(collection, 'draft.root.request.auth')
      : get(collection, 'root.request.auth');

    let headers = mergeHeaders(collection, request, requestTreePath);

    if (request.auth && request.auth.mode !== 'none') {
      headers = [...headers, ...getAuthHeaders(collectionAuth, request.auth)];
    }

    // 2. Interpolate if requested
    if (shouldInterpolate) {
      headers = interpolateHeaders(headers, variables);
      if (request.body) {
        request = { ...request, body: interpolateBody(request.body, variables) };
      }
      request.params = interpolateParams(request.params, variables);

      // Interpolate the auth object itself if needed for other logic,
      // but headers are already merged above.
      if (request.auth && request.auth.mode !== 'none') {
        request.auth = interpolateAuth(request.auth, variables);
      }
    }

    // 3. Build HAR and Generate Snippet
    const harRequest = buildHarRequest({ request, headers });
    const snippet = new HTTPSnippet(harRequest);
    let result = snippet.convert(language.target, language.client);

    // 4. Post-Process (Restoring placeholders)
    if (result && typeof result === 'string') {
      const prefix = BRUNO_VAR_PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const suffix = BRUNO_VAR_PLACEHOLDER_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const placeholderRegex = new RegExp(`${prefix}(.+?)${suffix}`, 'g');
      result = result.replace(placeholderRegex, '{{ $1 }}');

      const percentSentinelRegex = new RegExp(BRUNO_PERCENT_SENTINEL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(percentSentinelRegex, '%');
    }

    return result;
  } catch (error) {
    console.error('Snippet Generation Failed:', error);
    return 'Error: Unable to generate code. Please ensure your URL and variables are formatted correctly.';
  }
};

export {
  generateSnippet
};
