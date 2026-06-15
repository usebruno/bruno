import { buildHar } from '@usebruno/common';
import { stripOrigin } from '@usebruno/common/utils';
import { getAllVariables, getTreePathFromCollectionToItem, mergeHeaders } from 'utils/collections/index';
import { resolveInheritedAuth } from 'utils/auth';
import { get } from 'lodash';
import { parse } from 'url';
import { stringify } from 'query-string';

// curl --digest / --ntlm are surface-level snippet adjustments, not part of
// the HAR contract — keep them at this layer.
const addCurlAuthFlags = (curlCommand, auth) => {
  if (!auth || !curlCommand) return curlCommand;

  const authMode = auth.mode;

  if (authMode === 'digest' || authMode === 'ntlm') {
    const username = get(auth, `${authMode}.username`, '');
    const password = get(auth, `${authMode}.password`, '');
    const credentials = password ? `${username}:${password}` : username;
    const authFlag = authMode === 'digest' ? '--digest' : '--ntlm';
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

    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    const mergedHeaders = mergeHeaders(collection, request, requestTreePath);

    const settings = item.draft ? get(item, 'draft.settings') : get(item, 'settings');

    const sourceUrl = item.rawUrl || request.url;
    const { har, rawUrl, encodedUrl, unhash } = buildHar({
      request: {
        method: request.method,
        url: sourceUrl,
        params: request.params,
        pathParams: [],
        headers: mergedHeaders,
        body: request.body,
        auth: effectiveAuth,
        settings
      },
      variables,
      shouldInterpolate,
      oauth2Credentials: collection?.oauth2Credentials,
      collectionUid: collection?.uid
    });

    // Generate snippet using HTTPSnippet
    const snippet = new HTTPSnippet(har);
    let result = snippet.convert(language.target, language.client);

    // curl --digest / --ntlm flags. Snippet-text manipulation, not HAR.
    if (language.target === 'shell' && language.client === 'curl') {
      result = addCurlAuthFlags(result, effectiveAuth);
    }

    /**
     *
     * Display-swap. HTTPSnippet renders the URL in encoded form (using har.queryString as the source of truth).
     * For OFF mode we want the user's raw bytes visible in the snippet — swap the encoded path+query substring for the raw form.
     * For OFF: prefer item.rawUrl when the caller explicitly supplied it (legacy GenerateCodeItem pipeline does this so user-typed pre-encoded
     * bytes survive the WHATWG-URL normalization). Otherwise fall back to buildHar's rawUrl.
     */
    const displayRawUrl = item.rawUrl || rawUrl;
    const parsed = parse(encodedUrl, true, true);
    const search = stringify(parsed.query, { sort: false });
    const httpSnippetPath = search ? `${parsed.pathname}?${search}` : parsed.pathname;

    let desiredPath;
    if (settings?.encodeUrl === true) {
      // Apply the same encodeUrl() transform used by the actual request execution path
      // so the snippet matches what's sent on the wire.
      desiredPath = stripOrigin(encodedUrl);
    } else {
      desiredPath = stripOrigin(displayRawUrl);
      // HTTP raw target uses spaces as delimiters in the request line
      // (RFC 7230 §3.1.1), so a literal space would terminate the URI early.
      if (language.target === 'http') {
        desiredPath = desiredPath.replace(/ /g, '%20');
      }
    }

    if (httpSnippetPath !== desiredPath && httpSnippetPath?.length > 1) {
      result = result.replaceAll(httpSnippetPath, desiredPath);
    }

    // Restore `{{var}}` placeholders that buildHar hashed during processing.
    return unhash(result);
  } catch (error) {
    console.error('Error generating code snippet:', error);
    return 'Error generating code snippet';
  }
};

export {
  generateSnippet
};
