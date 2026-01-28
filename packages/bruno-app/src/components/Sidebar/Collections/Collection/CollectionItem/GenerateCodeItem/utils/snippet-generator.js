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

    const request = { ...item.request, url };

    // Standard Header/Auth Logic
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    let headers = mergeHeaders(collection, request, requestTreePath);
    if (request.auth && request.auth.mode !== 'none') {
      const collectionAuth = collection?.draft?.root ? get(collection, 'draft.root.request.auth') : get(collection, 'root.request.auth');
      headers = [...headers, ...getAuthHeaders(collectionAuth, request.auth)];
    }

    if (shouldInterpolate) {
      headers = interpolateHeaders(headers, variables);
      if (request.body) {
        request = { ...request, body: interpolateBody(request.body, variables) };
      }
      request.params = interpolateParams(request.params, variables);

      // Add auth headers if needed (auth inheritance is resolved upstream)
      if (request.auth && request.auth.mode !== 'none') {
        if (shouldInterpolate) {
          request.auth = interpolateAuth(request.auth, variables);
        }

        const authHeaders = getAuthHeaders(request.auth, collection, item);
        headers = [...headers, ...authHeaders];
      }
    }

    // 1. Build the "Perfect" HAR for the engine (URL normalized: {{ }} -> placeholder, [] -> %5B%5D, % encoded when not already)
    const harRequest = buildHarRequest({
      request,
      headers
    });

    // Generate snippet using HTTPSnippet
    const snippet = new HTTPSnippet(harRequest);
    let result = snippet.convert(language.target, language.client);

    // 3. Post-Process: Restore {{ variable }} from placeholder; restore only lone-% sentinel to '%' (not all %25)
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
