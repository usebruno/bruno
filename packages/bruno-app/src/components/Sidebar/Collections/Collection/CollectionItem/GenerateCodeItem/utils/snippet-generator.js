import { buildHarRequest } from 'utils/codegenerator/har';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { getAllVariables, getTreePathFromCollectionToItem, mergeHeaders } from 'utils/collections/index';
import { resolveInheritedAuth } from 'utils/auth';
import { get } from 'lodash';
import { interpolateUrl, interpolateUrlPathParams } from 'utils/url/index';
import { interpolateAuth, interpolateHeaders, interpolateBody, interpolateParams } from './interpolation';

const addCurlAuthFlags = (curlCommand, auth) => {
  if (!auth || !curlCommand) return curlCommand;

  const authMode = auth.mode;

  if (authMode === 'digest' || authMode === 'ntlm') {
    const username = get(auth, `${authMode}.username`, '');
    const password = get(auth, `${authMode}.password`, '');
    const credentials = password ? `${username}:${password}` : username;
    const authFlag = authMode === 'digest' ? '--digest' : '--ntlm';
    // Escape single quotes for shell safety: ' becomes '\''
    const escapedCredentials = credentials.replace(/'/g, `'\\''`);

    const curlMatch = curlCommand.match(/^(curl(?:\.exe)?)/i);
    if (curlMatch) {
      const curlCmd = curlMatch[1];
      const restOfCommand = curlCommand.slice(curlCmd.length);
      return `${curlCmd} ${authFlag} --user '${escapedCredentials}'${restOfCommand}`;
    }
  }

  return curlCommand;
};

const generateSnippet = ({ language, item, collection, shouldInterpolate = false }) => {
  try {
    // Get HTTPSnippet dynamically so mocks can be applied in tests
    const { HTTPSnippet } = require('httpsnippet');

    const variables = getAllVariables(collection, item);
    const request = item.request;

    let effectiveAuth = request.auth;
    if (request.auth?.mode === 'inherit') {
      const resolvedRequest = resolveInheritedAuth(item, collection);
      effectiveAuth = resolvedRequest.auth;
    }

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
    }

    // Always interpolate the URL for HAR generation (HTTPSnippet requires a valid URL)
    const rawUrl = request.url;
    const interpolatedUrl = interpolateUrl({ url: rawUrl, variables });
    const harUrl = interpolateUrlPathParams(interpolatedUrl, request.params);

    // Build HAR request with the interpolated URL without mutating the original request
    const harRequest = buildHarRequest({
      request: { ...request, url: harUrl },
      headers
    });

    // Generate snippet using HTTPSnippet
    const snippet = new HTTPSnippet(harRequest);
    let result = snippet.convert(language.target, language.client);

    // For curl target, add special auth flags for digest/ntlm
    if (language.target === 'shell' && language.client === 'curl') {
      result = addCurlAuthFlags(result, effectiveAuth);
    }

    // When not interpolating, replace the interpolated URL with the raw URL in the output
    if (!shouldInterpolate && rawUrl !== harUrl) {
      result = result.replace(harUrl, rawUrl);
    }

    return result;
  } catch (error) {
    console.error('Error generating code snippet:', error);
    return 'Error generating code snippet';
  }
};

export {
  generateSnippet
};
