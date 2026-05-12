import { buildHarRequest } from 'utils/codegenerator/har';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { getAllVariables, getTreePathFromCollectionToItem, mergeHeaders } from 'utils/collections/index';
import { resolveInheritedAuth } from 'utils/auth';
import { get } from 'lodash';
import { interpolateAuth, interpolateHeaders, interpolateBody, interpolateParams } from './interpolation';
import { encodeUrl as encodeUrlCommon, stripOrigin, patternHasher } from '@usebruno/common/utils';
import { parse } from 'url';
import { stringify } from 'query-string';

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

    // Hash {{var}} placeholders to URL-safe tokens so URL parsing, encoding, and
    // URL.canParse don't choke on the curly braces. The same hash function is
    // deterministic per variable name, so the same `{{baseUrl}}` produces the same
    // token in both request.url and rawUrl — restoring from either map works.
    const originalRequestUrl = request.url;
    const originalRawUrl = item.rawUrl || request.url;
    const { hashed: hashedRequestUrl, restore: restoreFromRequestUrl } = patternHasher(originalRequestUrl);
    const { hashed: hashedRawUrl, restore: restoreFromRawUrl } = patternHasher(originalRawUrl);

    // Always feed the HAR an encoded URL. HTTPSnippet's HAR validator rejects many
    // chars our URL.canParse accepts — literal space, <, >, ", \, ^, |, {, }, `,
    // raw unicode, etc. — so any of them in the raw URL would throw "Validation
    // Failed" before we ever reach the post-processing below. encodeUrl is
    // idempotent, so when the toggle is on the encoded URL matches desiredPath and
    // no substitution happens; when it's off, the post-processing replaces the
    // encoded path with stripOrigin(rawUrl) so the user sees their original chars.
    request.url = encodeUrlCommon(hashedRequestUrl);

    let result;
    try {
      // Build HAR request
      const harRequest = buildHarRequest({
        request,
        headers
      });

      // Generate snippet using HTTPSnippet
      const snippet = new HTTPSnippet(harRequest);
      result = snippet.convert(language.target, language.client);

      // For curl target, add special auth flags for digest/ntlm
      if (language.target === 'shell' && language.client === 'curl') {
        result = addCurlAuthFlags(result, effectiveAuth);
      }

      // Respect encodeUrl setting: when not explicitly true, replace HTTPSnippet's encoded path+query with the raw version.
      // Replacing the path portion works for all targets since it's a substring of the full URL.
      // encodeUrl defaults to false in the UI when undefined/null
      const settings = item.draft ? get(item, 'draft.settings') : get(item, 'settings');
      const parsed = parse(request.url, true, true);
      const search = stringify(parsed.query, { sort: false });
      const httpSnippetPath = search ? `${parsed.pathname}?${search}` : parsed.pathname;

      let desiredPath;
      if (settings?.encodeUrl === true) {
        // Apply the same encodeUrl() transform used by the actual request execution path
        // so the snippet matches what's sent on the wire.
        const encodedUrl = encodeUrlCommon(hashedRawUrl);
        desiredPath = stripOrigin(encodedUrl);
        // Strip fragment per RFC 3986 §3.5
        desiredPath = desiredPath.replace(/#.*$/, '');
      } else {
        desiredPath = stripOrigin(hashedRawUrl);
        // The HTTP raw target (http/http1.1) uses the request line format:
        //   METHOD <request-target> HTTP-version
        // Spaces delimit these fields, so a literal space in the request-target
        // would be parsed as the end of the URI (RFC 7230 §3.1.1).
        if (language.target === 'http') {
          desiredPath = desiredPath.replace(/ /g, '%20');
        }
      }

      if (httpSnippetPath !== desiredPath && httpSnippetPath?.length > 1) {
        result = result.replaceAll(httpSnippetPath, desiredPath);
      }
    } finally {
      // Restore mutated state on the shared request object whether or not
      // conversion threw — generateSnippet is called repeatedly from CodeView renders.
      request.url = originalRequestUrl;
    }

    // Restore {{var}} placeholders in the final string. Running both restore maps
    // is idempotent — they cover the same vars (deterministic hashes) and replaceAll
    // is a no-op if the token isn't present.
    result = restoreFromRequestUrl(result);
    result = restoreFromRawUrl(result);
    return result;
  } catch (error) {
    console.error('Error generating code snippet:', error);
    return 'Error generating code snippet';
  }
};

export {
  generateSnippet
};
