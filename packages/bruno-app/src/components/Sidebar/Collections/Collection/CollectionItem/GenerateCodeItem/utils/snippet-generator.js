import { buildHar } from '@usebruno/common';
import { stripOrigin } from '@usebruno/common/utils';
import { getAllVariables, getTreePathFromCollectionToItem, mergeHeaders } from 'utils/collections/index';
import { resolveInheritedAuth } from 'utils/auth';
import { get } from 'lodash';
import { interpolateUrl, interpolateUrlPathParams, prependDefaultScheme } from 'utils/url/index';
import { parse } from 'url';
import { stringify } from 'query-string';

// Folds any `cookie`/`Cookie` header into a single header.
const mergeCookieHeaders = (headers, capitalizeCookieHeaderName) => {
  let cookieHeaderIndex = -1;
  const merged = [];
  for (const header of headers) {
    if (header.name.toLowerCase() !== 'cookie') {
      merged.push(header);
      continue;
    }
    if (cookieHeaderIndex === -1) {
      cookieHeaderIndex = merged.length;
      merged.push({ ...header, name: capitalizeCookieHeaderName ? 'Cookie' : header.name });
    } else {
      merged[cookieHeaderIndex].value += `; ${header.value}`;
    }
  }
  return merged;
};

/**
 * HTTPSnippet keys headers by name, so a header repeated on the request keeps only its last value.
 * Each repeated name (matched case-insensitively) is handed to it as one header holding a
 * placeholder, and `expandRepeatedHeaders` writes every value back on its own line. Content-Type
 * is left alone: the request runtime sends only its last value too.
 */
const collapseRepeatedHeaders = (headers) => {
  const counts = new Map();
  headers.forEach((header) => {
    const key = header.name.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const repeatedByName = new Map();
  const collapsed = [];
  headers.forEach((header) => {
    const key = header.name.toLowerCase();
    if (counts.get(key) < 2 || key === 'content-type') {
      collapsed.push(header);
      return;
    }
    if (!repeatedByName.has(key)) {
      const placeholder = `__bruno_repeated_header_${repeatedByName.size}__`;
      repeatedByName.set(key, { placeholder, values: [] });
      collapsed.push({ ...header, value: placeholder });
    }
    repeatedByName.get(key).values.push(header.value);
  });

  return { headers: collapsed, repeated: Array.from(repeatedByName.values()) };
};

// HTTPSnippet's curl target always single-quotes a `name: value` header argument.
const escapeForSingleQuotes = (value) => value.replace(/'/g, `'\\''`);

const expandRepeatedHeaders = (snippet, repeated, isCurl) => repeated.reduce((result, { placeholder, values }) => {
  const expanded = isCurl
    ? result.replace(
        new RegExp(`^([ \\t]*)(-H|--header) '([^'\\n]*): ${placeholder}'`, 'm'),
        (_, indent, flag, name) => values.map((value) => `${indent}${flag} '${name}: ${escapeForSingleQuotes(value)}'`).join(' \\\n')
      )
    : result.replace(
        new RegExp(`^([^\\r\\n]*): ${placeholder}(?=\\r?\\n|$)`, 'm'),
        (_, name) => values.map((value) => `${name}: ${value}`).join('\r\n')
      );

  // Should HTTPSnippet's line format ever change, fall back to the last value it would have shown.
  const lastValue = values[values.length - 1];
  return expanded.includes(placeholder)
    ? expanded.replaceAll(placeholder, () => (isCurl ? escapeForSingleQuotes(lastValue) : lastValue))
    : expanded;
}, snippet);

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

const generateSnippet = async ({ language, item, collection, shouldInterpolate = false }) => {
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

    // buildHar intentionally does NOT resolve `{{var}}` / `:pathParam` in the URL
    const sourceUrl = shouldInterpolate
      ? interpolateUrlPathParams(
          interpolateUrl({ url: request.url, variables }) || '',
          request.params,
          variables,
          { raw: true }
        )
      : prependDefaultScheme(request.url);

    const { har, rawUrl, encodedUrl, unhash } = await buildHar({
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

    const isCurl = language.target === 'shell' && language.client === 'curl';
    const isLibcurl = language.target === 'c' && language.client === 'libcurl';
    const isRawHttp = language.target === 'http';

    let headers = mergeCookieHeaders(har.headers, isCurl || isLibcurl);
    let repeatedHeaders = [];
    if (isCurl || isRawHttp) {
      ({ headers, repeated: repeatedHeaders } = collapseRepeatedHeaders(headers));
    }

    // Generate snippet using HTTPSnippet
    const snippet = new HTTPSnippet({ ...har, headers });
    let result = expandRepeatedHeaders(snippet.convert(language.target, language.client), repeatedHeaders, isCurl);

    // curl --digest / --ntlm flags. Snippet-text manipulation, not HAR.
    if (isCurl) {
      result = addCurlAuthFlags(result, effectiveAuth);
    }
    /**
     *
     * Display-swap. HTTPSnippet renders the URL in encoded form (using har.queryString as the source of truth).
     * For OFF mode we want the user's raw bytes visible in the snippet — swap the encoded path+query substring for the raw form.
     * buildHar derives `rawUrl` from the exact URL passed in above, so it carries the user's
     * pre-encoded bytes (and, when the toggle is OFF, the un-substituted placeholders).
     * `item.rawUrl` remains honoured for callers that resolve the URL themselves and want
     * their own bytes displayed; GenerateCodeItem no longer sets it.
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
