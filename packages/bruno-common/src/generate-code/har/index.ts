/**
 * Bruno → HAR generation.
 *
 * This module is the single canonical pipeline for turning a Bruno request
 * (interpolation, path-param substitution, auth resolution, header merging,
 * URL encoding, query handling, HAR assembly) into the HTTP Archive (HAR)
 * shape consumed by both Generate Code (HTTPSnippet) and — in a follow-up
 * PR — the runtime (via a HAR→axios adapter).
 *
 * The previous architecture spread these concerns across 5+ files in
 * `bruno-app` plus a parallel set in `bruno-electron`/`bruno-cli`, and the
 * runtime↔codegen drift produced every reported URL-encoding bug
 * (#5788, #6268, #7356, #7653, #7913, plus the #tag#tag doubling and the
 * `post_ids[]` / `key[a][b]` bracket-phantom-duplicate bugs).
 *
 * By centralising the work here:
 *   - There is exactly one place that decides what reaches the wire.
 *   - PR #5507's content-blind double-encoding contract is honored by
 *     calling `encodeUrl()` from `../utils/url` (no decode-then-encode).
 *   - The HAR `url` field is path-only; `queryString` is the sole source
 *     of truth for the rendered query string, which sidesteps HTTPSnippet's
 *     legacy `url.parse(..., true, true)` polyfill that strips trailing
 *     `[]` from keys (the bracket-phantom bug).
 *   - `{{var}}` tokens that callers don't want resolved are hashed before
 *     URL parsing/encoding via `patternHasher`, then restored at the end
 *     via the returned `unhash` function — so snippets remain
 *     copy-shareable with templates intact.
 */

import interpolate, { interpolateObject } from '../../interpolate';
import { encodeUrl, stripOrigin, patternHasher, parseQueryParams } from '../../utils';
import { cloneDeep, find, get } from 'lodash';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BrunoKV = {
  name: string;
  value: string;
  type?: string;
  enabled?: boolean;
};

export type BrunoBody = {
  mode?: string;
  [key: string]: any;
};

export type BrunoAuth = {
  mode?: string;
  [key: string]: any;
};

export type BrunoRequest = {
  method?: string;
  url: string;
  params?: BrunoKV[];
  pathParams?: BrunoKV[];
  headers?: BrunoKV[];
  body?: BrunoBody;
  auth?: BrunoAuth;
  settings?: { encodeUrl?: boolean };
};

/**
 * Stored OAuth2 credential record (read from `collection.oauth2Credentials`).
 * Passed in as input so `buildHar` stays pure (no collection traversal);
 * the caller pre-collects the records relevant to this request.
 */
export type OAuth2CredentialRecord = {
  url?: string;
  collectionUid?: string;
  credentialsId?: string;
  credentials?: { access_token?: string };
};

export type BuildHarInput = {
  request: BrunoRequest;
  /**
   * Merged variable map: global / collection / folder / request / runtime /
   * oauth2-creds / prompt vars / process.env, in precedence order resolved
   * by the caller (the caller is the only place that knows the collection
   * tree). `buildHar` just substitutes from this map.
   */
  variables?: Record<string, unknown>;
  /**
   * When `false` (default for Generate Code's "show snippet without
   * resolving variables" mode), `{{var}}` tokens are hashed before URL
   * parsing/encoding via `patternHasher`, then exposed via the returned
   * `unhash` function so the caller can restore them in the final output.
   */
  shouldInterpolate?: boolean;
  /**
   * OAuth2 stored credentials. Used to look up the actual access token
   * when `auth.mode === 'oauth2'` and `tokenPlacement === 'header'`.
   */
  oauth2Credentials?: OAuth2CredentialRecord[];
  collectionUid?: string;
};

export type HarRequest = {
  method: string;
  url: string;
  httpVersion: string;
  cookies: unknown[];
  headers: { name: string; value: string }[];
  queryString: { name: string; value: string }[];
  postData: any;
  headersSize: number;
  bodySize: number;
  binary: boolean;
};

export type BuildHarOutput = {
  /** Canonical HAR object, ready for HTTPSnippet (and, post-Phase-C, an axios adapter). */
  har: HarRequest;
  /**
   * The user's URL after path-param substitution but BEFORE `encodeUrl`
   * was applied. Used by Generate Code's display-swap step when toggle
   * is off (snippet shows the user's typed encoding, not Bruno's).
   */
  rawUrl: string;
  /** The URL after `encodeUrl` was applied (matches the HAR's stored form). */
  encodedUrl: string;
  /**
   * Restores `{{var}}` tokens in a string. When `shouldInterpolate=false`,
   * Generate Code calls this on the final snippet so templates survive
   * verbatim through HTTPSnippet's URL parsing.
   */
  unhash: (input: string) => string;
  /**
   * The auth object as it was applied to the request. Exposed so Generate
   * Code can attach curl-specific flags (`--digest`, `--ntlm`) downstream.
   */
  effectiveAuth: BrunoAuth | null;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const contentTypeFromBodyMode = (mode?: string): string => {
  switch (mode) {
    case 'json': return 'application/json';
    case 'text': return 'text/plain';
    case 'xml': return 'application/xml';
    case 'sparql': return 'application/sparql-query';
    case 'formUrlEncoded': return 'application/x-www-form-urlencoded';
    case 'graphql': return 'application/json';
    case 'multipartForm': return 'multipart/form-data';
    case 'file': return 'application/octet-stream';
    default: return '';
  }
};

/**
 * Strip the query string from a URL (everything between the first `?` and
 * the fragment marker `#`). Preserves scheme, authority, path, fragment.
 *
 * HTTPSnippet receives a URL without its query so its internal
 * `url.parse(..., true, true)` has nothing to mis-parse. The
 * `queryString` array is the sole source of truth — no merge bug.
 */
const stripQueryStringFromUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/^([^#?]*)\?[^#]*/, '$1');
};

/**
 * Interpolate `{{var}}` placeholders in the request's URL, headers, body,
 * auth, params, and pathParams. The body interpolation is mode-aware so
 * JSON stays valid and form params get value-only interpolation.
 */
const interpolateRequest = (request: BrunoRequest, variables: Record<string, unknown>): BrunoRequest => {
  const r = cloneDeep(request);

  // NOTE: URL interpolation is intentionally NOT done here. URL `{{var}}` resolution
  // is the caller's responsibility (e.g., GenerateCodeItem in bruno-app does its
  // own `interpolateUrl` upstream). buildHar always runs the patternHasher on the
  // URL — leftover `{{var}}` tokens are hashed before parsing/encoding so the URL
  // stays parseable, then restored via the returned `unhash` on the final output.
  // This preserves the previous snippet-generator's contract that
  // shouldInterpolate=true does NOT resolve URL placeholders (only body, headers,
  // auth, params, pathParams).

  if (Array.isArray(r.headers)) {
    r.headers = r.headers.map((h) => h && h.enabled !== false ? (interpolateObject(h, variables) as BrunoKV) : h);
  }

  if (Array.isArray(r.params)) {
    r.params = r.params.map((p) => p && p.enabled !== false ? (interpolateObject(p, variables) as BrunoKV) : p);
  }

  if (Array.isArray(r.pathParams)) {
    r.pathParams = r.pathParams.map((p) => interpolateObject(p, variables) as BrunoKV);
  }

  if (r.auth) {
    r.auth = interpolateObject(r.auth, variables) as BrunoAuth;
  }

  if (r.body && typeof r.body === 'object') {
    const body = { ...r.body };
    switch (body.mode) {
      case 'json': {
        let parsed = body.json;
        if (typeof parsed === 'object') parsed = JSON.stringify(parsed);
        parsed = interpolate(parsed, variables, { escapeJSONStrings: true });
        try {
          const jsonObj = JSON.parse(parsed);
          body.json = JSON.stringify(jsonObj, null, 2);
        } catch {
          body.json = parsed;
        }
        break;
      }
      case 'text': body.text = interpolate(body.text, variables); break;
      case 'xml': body.xml = interpolate(body.xml, variables); break;
      case 'sparql': body.sparql = interpolate(body.sparql, variables); break;
      case 'formUrlEncoded':
        body.formUrlEncoded = Array.isArray(body.formUrlEncoded)
          ? body.formUrlEncoded.map((p: any) => ({
              ...p,
              value: p.enabled ? interpolate(p.value, variables) : p.value
            }))
          : [];
        break;
      case 'multipartForm':
        body.multipartForm = Array.isArray(body.multipartForm)
          ? body.multipartForm.map((p: any) => ({
              ...p,
              value: p.type === 'text' && p.enabled ? interpolate(p.value, variables) : p.value
            }))
          : [];
        break;
      default: break;
    }
    r.body = body;
  }

  return r;
};

/**
 * Substitute `:id` path params (and OData-style parenthesised params) into
 * the URL. When `options.encodeUrl` is true, each substituted value is
 * `encodeURIComponent`'d — this is the issue #7356 fix surface.
 *
 * Returns the URL with substitutions applied. Path-param values are not
 * URL-encoded structurally (only via the optional toggle), so callers that
 * want a "raw" view (the URL as the user effectively typed) pass
 * `options.encodeUrl=false`.
 */
/**
 * Replace each `:id` (or OData `Foo(:id)`) position in the URL with a
 * unique URL-safe placeholder, and return a map of placeholder → raw value.
 *
 * The placeholder shape is `__BRUNO_PATH_PARAM_<n>__` — alphanumeric plus
 * underscore only, so `encodeURIComponent` and `encodeUrl` leave it untouched.
 * The caller then runs `encodeUrl` on the URL (encoding any non-placeholder
 * path chars correctly) and finally calls `restorePathParamPlaceholders` to
 * swap each placeholder for either the raw value (toggle OFF) or the
 * single-encoded value (toggle ON).
 *
 * This indirection is what prevents the double-encoding that fall out of
 * doing `substitute-with-encoding → encodeUrl` back to back: the second pass
 * would content-blind-encode the already-encoded segment (e.g. `aaa%2Fbbb`
 * → `aaa%252Fbbb`) per PR #5507. By hiding path-param positions behind
 * placeholders during the `encodeUrl` pass, encoding happens exactly once
 * — when the placeholders are restored.
 */
const hashPathParamPositions = (
  url: string,
  pathParams: BrunoKV[] | undefined
): { url: string; placeholders: Map<string, string> } => {
  const placeholders = new Map<string, string>();
  if (!url || !Array.isArray(pathParams) || pathParams.length === 0) {
    return { url, placeholders };
  }

  let prefix = '';
  let working = url;
  if (!working.startsWith('http://') && !working.startsWith('https://')) {
    working = 'http://' + working;
    prefix = '__BRUNO_HAR_HTTP_PLACEHOLDER__';
  }

  // Walk segment-by-segment to support both `:id` and OData `Foo(:id)`
  // shapes. Plain string ops (no `new URL()`) so reserved chars in
  // path-param values never get lost.
  const separatorIdx = working.search(/[?#]/);
  const pathPart = separatorIdx >= 0 ? working.substring(0, separatorIdx) : working;
  const rest = separatorIdx >= 0 ? working.substring(separatorIdx) : '';

  const authorityMatch = pathPart.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]*)?(.*)$/i);
  const authority = authorityMatch?.[1] ?? '';
  const path = authorityMatch?.[2] ?? pathPart;

  const enabledPathParams = pathParams.filter((p) => p && p.enabled !== false);

  let counter = 0;
  const nextPlaceholder = (value: string): string => {
    const ph = `__BRUNO_PATH_PARAM_${counter++}__`;
    placeholders.set(ph, value == null ? '' : String(value));
    return ph;
  };

  const substitutedPath = path
    .split('/')
    .map((segment, idx) => {
      if (idx === 0 && segment === '') return ''; // leading slash artifact

      // Traditional `:paramName`
      if (segment.startsWith(':')) {
        const name = segment.slice(1);
        const match = enabledPathParams.find((p) => p?.name === name && (p?.type === undefined || p?.type === 'path'));
        return match ? nextPlaceholder(match.value) : segment;
      }

      // OData-style: EntitySet(':keyName') or EntitySet(:keyName) or Function(:p1, :p2)
      if (/^[A-Za-z0-9_.-]+\([^)]*\)$/.test(segment)) {
        const regex = /[:]([a-zA-Z_]\w*)/g;
        let m: RegExpExecArray | null;
        let result = segment;
        while ((m = regex.exec(segment))) {
          if (!m[1]) continue;
          let bareName = m[1].replace(/[')"`]+$/, '');
          bareName = bareName.replace(/^[('"`]+/, '');
          if (!bareName) continue;
          const match = enabledPathParams.find((p) => p?.name === bareName && (p?.type === undefined || p?.type === 'path'));
          if (match) {
            result = result.replace(':' + m[1], nextPlaceholder(match.value));
          }
        }
        return result;
      }

      return segment;
    })
    .join('/');

  let finalUrl = authority + substitutedPath + rest;
  if (prefix) finalUrl = finalUrl.replace(/^http:\/\//, '');
  return { url: finalUrl, placeholders };
};

/**
 * Swap each placeholder back to its real value. When `encode` is true the
 * value goes through `encodeURIComponent` (single-encoded — the path-param
 * value never makes it through `encodeUrl` so there's no second pass to
 * double-encode it). When `encode` is false the value is restored raw.
 */
const restorePathParamPlaceholders = (
  url: string,
  placeholders: Map<string, string>,
  options: { encode: boolean }
): string => {
  if (!url || placeholders.size === 0) return url;
  let result = url;
  for (const [placeholder, value] of placeholders) {
    const replacement = options.encode ? encodeURIComponent(value) : value;
    result = result.replaceAll(placeholder, replacement);
  }
  return result;
};

/**
 * Sanity check that the URL has at least a scheme + authority. This is
 * intentionally loose — any URL the user can legally type should pass.
 * The stricter `URL.canParse` check was fighting downstream encoders
 * (issues #6268, #7653, #7913).
 */
const looksLikeUrl = (url: string | undefined): boolean =>
  typeof url === 'string' && /^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i.test(url);

/**
 * Translate the resolved auth mode into one or more headers to append to
 * the request. For OAuth2 token-in-header placement, looks up the actual
 * access token from `oauth2Credentials` (passed in by the caller).
 *
 * Auth modes that produce no header here (and are handled elsewhere):
 *   - 'apikey' with placement='queryparams'  → added to queryString in buildQueryString
 *   - 'oauth2' with tokenPlacement='url'     → not currently surfaced in codegen
 *   - 'oauth1'                                → requires runtime signing
 *   - 'digest', 'ntlm'                        → curl gets --digest/--ntlm flags
 *                                                 attached post-snippet by the caller
 *   - 'awsv4'                                 → runtime-only signing
 *   - 'wsse'                                  → runtime-only signing
 */
const authToHeaders = (
  auth: BrunoAuth | undefined,
  variables: Record<string, unknown>,
  oauth2Credentials: OAuth2CredentialRecord[] | undefined,
  collectionUid: string | undefined
): BrunoKV[] => {
  if (!auth || !auth.mode || auth.mode === 'none' || auth.mode === 'inherit') return [];

  switch (auth.mode) {
    case 'basic': {
      const username = get(auth, 'basic.username', '') as string;
      const password = get(auth, 'basic.password', '') as string;
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      return [{ name: 'Authorization', value: `Basic ${token}`, enabled: true }];
    }

    case 'bearer':
      return [{ name: 'Authorization', value: `Bearer ${get(auth, 'bearer.token', '')}`, enabled: true }];

    case 'apikey': {
      const placement = get(auth, 'apikey.placement', 'header') as string;
      if (placement !== 'header') return [];
      const key = get(auth, 'apikey.key', '') as string;
      const value = get(auth, 'apikey.value', '') as string;
      if (!key) return [];
      return [{ name: key, value, enabled: true }];
    }

    case 'oauth2': {
      const tokenPlacement = get(auth, 'oauth2.tokenPlacement', 'header') as string;
      if (tokenPlacement !== 'header') return [];

      const tokenHeaderPrefix = get(auth, 'oauth2.tokenHeaderPrefix', 'Bearer') as string;
      // Precedence: stored credentials → auth.oauth2.accessToken → placeholder.
      // Matches bruno-app's getAuthHeaders so generated snippets carry the
      // user's directly-configured token when present.
      let accessToken = (get(auth, 'oauth2.accessToken', '') as string) || '<access_token>';

      if (Array.isArray(oauth2Credentials) && collectionUid) {
        try {
          const grantType = get(auth, 'oauth2.grantType', '') as string;
          const urlField = grantType === 'implicit' ? 'oauth2.authorizationUrl' : 'oauth2.accessTokenUrl';
          const rawUrl = get(auth, urlField, '') as string;
          const credentialsId = get(auth, 'oauth2.credentialsId', 'credentials') as string;
          const interpolatedUrl = rawUrl ? interpolate(rawUrl, variables) : '';
          if (interpolatedUrl) {
            const match = find(
              oauth2Credentials,
              (rec: OAuth2CredentialRecord) =>
                rec?.url === interpolatedUrl
                && rec?.collectionUid === collectionUid
                && rec?.credentialsId === credentialsId
            );
            if (match?.credentials?.access_token) {
              accessToken = match.credentials.access_token;
            }
          }
        } catch {
          // Fall back to placeholder if anything fails — never throw here.
        }
      }

      const headerValue = (tokenHeaderPrefix ? `${tokenHeaderPrefix} ${accessToken}` : accessToken).trim();
      return [{ name: 'Authorization', value: headerValue, enabled: true }];
    }

    // OAuth1 cannot pre-compute the signature for a static snippet.
    // Digest/NTLM/AWS/WSSE are runtime-signed.
    default:
      return [];
  }
};

const mergeAndDedupeHeaders = (existing: BrunoKV[] | undefined, additions: BrunoKV[]): BrunoKV[] => {
  const result = Array.isArray(existing) ? [...existing] : [];
  for (const h of additions) {
    if (!h) continue;
    result.push(h);
  }
  return result;
};

/**
 * Filter to enabled headers, **preserve the user-typed case** of each name,
 * and append a default `Content-Type` when the body mode implies one and the
 * user hasn't already set it.
 *
 * HTTP header names are case-insensitive per RFC 7230 §3.2, so the wire
 * doesn't care between `Authorization` and `authorization`. But the
 * generated *code snippet* is a copy-paste artifact — users expect to see
 * the casing they typed. Lowercasing here mangles things like `X-API-Key`
 * or `Content-Type` into shapes nobody types by hand. The dedup check for
 * the default content-type rule is done case-insensitively so it still
 * fires correctly when the user typed `Content-Type` vs `content-type`.
 */
const finalizeHeaders = (request: BrunoRequest, headers: BrunoKV[]): { name: string; value: string }[] => {
  const enabled = (headers || [])
    .filter((h) => h && h.enabled !== false)
    .map((h) => ({ name: String(h.name), value: String(h.value ?? '') }));

  const implicitCT = contentTypeFromBodyMode(request?.body?.mode);
  if (implicitCT && !enabled.some((h) => h.name.toLowerCase() === 'content-type')) {
    enabled.push({ name: 'Content-Type', value: implicitCT });
  }

  return enabled;
};

/**
 * Assemble HAR `queryString` from the request's params array plus any
 * auth-driven query params (e.g. api-key with placement='queryparams').
 */
const buildQueryString = (
  request: BrunoRequest,
  urlForFallback?: string
): { name: string; value: string }[] => {
  const enabledParams = Array.isArray(request.params)
    ? request.params.filter((p) => p && p.enabled !== false && p.type === 'query')
    : [];

  // Primary source: request.params (synced with the URL by the Redux reducer in
  // production). Fallback: if params is empty but the URL string carries a query,
  // parse the query directly. This catches synthetic / test inputs that only set
  // request.url and skip the params array, and keeps wire output stable for
  // callers that bypass the params syncer.
  let params: { name: string; value: string }[];
  if (enabledParams.length > 0) {
    params = enabledParams.map((p) => ({ name: p.name, value: p.value }));
  } else if (urlForFallback) {
    // `#` is data (Option C — see encodeUrl), so the query slice extends to
    // end-of-string and parseQueryParams is told NOT to split on `#`.
    // Anything after `#` ends up as part of the last value, which is what
    // the encoder and the OFF-mode display-swap both expect.
    const queryIdx = urlForFallback.indexOf('?');
    const queryString = queryIdx >= 0 ? urlForFallback.slice(queryIdx + 1) : '';
    params = queryString
      ? parseQueryParams(queryString, { decode: false, stripFragment: false }).map((p) => ({
          name: p.name,
          value: p.value == null ? '' : p.value
        }))
      : [];
  } else {
    params = [];
  }

  const auth = request.auth;
  if (
    auth?.mode === 'apikey'
    && get(auth, 'apikey.placement') === 'queryparams'
    && get(auth, 'apikey.key')
    && get(auth, 'apikey.value')
  ) {
    params.push({ name: get(auth, 'apikey.key') as string, value: get(auth, 'apikey.value') as string });
  }

  return params;
};

/** HAR `postData` for the request body. Mirrors the body-mode contract. */
const buildPostData = (body: BrunoBody | undefined): any => {
  if (!body || !body.mode) return undefined;
  const mimeType = contentTypeFromBodyMode(body.mode);

  switch (body.mode) {
    case 'formUrlEncoded': {
      const arr: any[] = Array.isArray(body.formUrlEncoded) ? body.formUrlEncoded : [];
      const enabled = arr.filter((p) => p?.enabled);
      const reduced = enabled.reduce<Record<string, string>>((acc, p) => {
        acc[p.name] = p.value; return acc;
      }, {});
      return {
        mimeType,
        text: new URLSearchParams(reduced).toString(),
        params: enabled.map((p) => ({ name: p.name, value: p.value }))
      };
    }
    case 'multipartForm': {
      const arr: any[] = Array.isArray(body.multipartForm) ? body.multipartForm : [];
      return {
        mimeType,
        params: arr
          .filter((p) => p?.enabled)
          .map((p) => ({
            name: p.name,
            value: p.value,
            ...(p.type === 'file' && { fileName: p.value })
          }))
      };
    }
    case 'file': {
      const files: any[] = Array.isArray(body.file) ? body.file : [];
      const selected = files.find((f) => f.selected) || files[0];
      const filePath = selected?.filePath || '';
      return {
        mimeType: selected?.contentType || 'application/octet-stream',
        text: filePath,
        params: filePath
          ? [{
              name: selected?.name || 'file',
              value: filePath,
              fileName: filePath,
              contentType: selected?.contentType || 'application/octet-stream'
            }]
          : []
      };
    }
    case 'graphql':
      return { mimeType, text: JSON.stringify(body.graphql) };
    default:
      return { mimeType, text: body[body.mode] };
  }
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function buildHar(input: BuildHarInput): BuildHarOutput {
  const variables = input.variables || {};
  const shouldInterpolate = input.shouldInterpolate ?? true;

  // Step 1 & 2 — hash {{var}} placeholders OR substitute them.
  // When the caller wants templates preserved in the snippet (shouldInterpolate=false),
  // we replace `{{var}}` with deterministic URL-safe hashes BEFORE any URL parsing
  // or encoding runs. The returned `unhash` lets the caller restore originals at the end.
  let working = shouldInterpolate ? interpolateRequest(input.request, variables) : cloneDeep(input.request);

  // The hashers operate at the URL-string layer specifically. Headers/body
  // /auth/params with `{{var}}` would only render in the snippet text;
  // those callers that don't want them resolved can pre-hash before calling
  // buildHar OR pass `shouldInterpolate=true`. For typical Generate Code
  // usage, `shouldInterpolate=false` means "preserve URL-bar templates".
  const { hashed: hashedUrl, restore: restoreUrlVars } = patternHasher(working.url || '');

  // Step 3 — Hash path-param positions to URL-safe placeholders, capture the
  // raw values in a map. The URL now contains tokens like `__BRUNO_PATH_PARAM_0__`
  // instead of `:id`, so the next `encodeUrl()` pass can encode non-path-param
  // chars in the path without touching path-param values. This is what makes
  // encoding single-pass for path-params (issue #7356) while still letting
  // `encodeUrl()` correctly handle other path chars / query encoding.
  const encodeFlag = working.settings?.encodeUrl === true;
  const { url: urlWithPlaceholders, placeholders } = hashPathParamPositions(hashedUrl, working.pathParams);

  // Step 4 — Apply `encodeUrl()` to the URL with placeholders. Placeholders
  // are alphanumeric+underscore, so `encodeURIComponent` (used per path
  // segment inside `encodeUrl`) leaves them untouched. The rest of the path
  // and query are encoded per the existing content-blind contract (PR #5507).
  const encodedUrlWithPlaceholders = encodeUrl(urlWithPlaceholders);

  // Step 5 — Restore placeholders. `rawUrl` always uses raw values (for the
  // toggle-OFF display swap upstream). `encodedUrl` uses single-encoded
  // values when toggle is ON, raw when OFF.
  const rawUrl = restorePathParamPlaceholders(urlWithPlaceholders, placeholders, { encode: false });
  const encodedUrl = restorePathParamPlaceholders(encodedUrlWithPlaceholders, placeholders, { encode: encodeFlag });

  // Sanity gate. Stays here so HAR consumers see exactly what we'd send.
  if (!looksLikeUrl(encodedUrl)) {
    throw new Error('invalid request url');
  }

  // Step 5 — Auth → headers. Append to request headers.
  const authHeaders = authToHeaders(working.auth, variables, input.oauth2Credentials, input.collectionUid);
  const allHeaders = mergeAndDedupeHeaders(working.headers, authHeaders);

  // Step 6 — Finalize headers (filter enabled, lowercase, default content-type).
  const harHeaders = finalizeHeaders(working, allHeaders);

  // Step 7 — Query string array. HAR's queryString is the single source of
  // truth for what HTTPSnippet renders into the URL slot. The URL itself
  // (next step) has its query stripped to avoid the legacy-polyfill merge bug.
  // Pass the RAW URL (pre-encodeUrl) as the fallback source: HTTPSnippet
  // re-encodes each queryString value via encodeURIComponent when rendering,
  // so the entries here must carry user-typed bytes. Feeding the encoded URL
  // here would cause double-encoding (`:` → `%3A` from encodeUrl, then
  // `%3A` → `%253A` from HTTPSnippet's encodeURIComponent pass).
  const harQueryString = buildQueryString(working, working.url);

  // Step 8 — Strip the URL's query before storing in HAR (the bracket-key fix).
  const harUrl = stripQueryStringFromUrl(encodedUrl);

  // Step 9 — Assemble.
  const har: HarRequest = {
    method: working.method || 'GET',
    url: harUrl,
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headers: harHeaders,
    queryString: harQueryString,
    postData: buildPostData(working.body),
    headersSize: 0,
    bodySize: 0,
    binary: true
  };

  const unhash = (s: string): string => (typeof s === 'string' ? restoreUrlVars(s) : s);

  return {
    har,
    rawUrl,
    encodedUrl,
    unhash,
    effectiveAuth: working.auth ?? null
  };
}
