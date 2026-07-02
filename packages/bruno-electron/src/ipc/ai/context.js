/**
 * Shared context formatting + redaction primitives used by every AI surface
 * (chat sidebar, script generation, autocomplete).
 *
 * Everything that goes to a provider passes through this module so the rules
 * (which header names are sensitive, how response bodies are stripped, how a
 * variable marked `secret: true` appears) stay consistent across surfaces.
 */

// --- Sensitive header / param / variable names ---------------------------

const SENSITIVE_HEADER_PATTERNS = [
  /^authorization$/i,
  /^proxy-authorization$/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /^x-api-key$/i,
  /^x-auth-token$/i,
  /^x-access-token$/i,
  /^x-csrf-token$/i,
  /api[_-]?key/i,
  // Catches refresh_token, id_token, csrfToken, plain TOKEN, etc. on top of
  // the specific access/auth-token forms above.
  /token/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /secret/i,
  /password/i
];

const REDACTED_VALUE = '<redacted>';

const isSensitiveName = (name) => {
  if (!name) return false;
  return SENSITIVE_HEADER_PATTERNS.some((re) => re.test(name));
};

const maskValue = (name, value) => (isSensitiveName(name) ? REDACTED_VALUE : value);

const normalizeList = (list) =>
  Array.isArray(list)
    ? list.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
    : [];

const buildRedactionPolicy = (security) => {
  const redactHeaders = security?.redactHeaders !== false;
  const redactBody = security?.redactBody !== false;
  const redactVariables = security?.redactVariables !== false;
  const redactResponse = security?.redactResponse !== false;
  const customHeaderSet = new Set(normalizeList(security?.customRedactedHeaders));
  const customVarSet = new Set(normalizeList(security?.customRedactedVariables));

  return {
    redactHeaders,
    redactBody,
    redactVariables,
    redactResponse,
    isSensitiveHeader: (name) => {
      if (!name) return false;
      if (customHeaderSet.has(String(name).toLowerCase())) return true;
      return isSensitiveName(name);
    },
    // Body checks reuse the header list — custom entries are matched exactly,
    // so a user who adds `password` here also catches JSON keys named the same.
    isSensitiveKey: (name) => {
      if (!name) return false;
      if (customHeaderSet.has(String(name).toLowerCase())) return true;
      return isSensitiveName(name);
    },
    // Explicit custom entries always redact — the toggle only gates
    // pattern-based matches, since the user opted into the specific names.
    isCustomVariable: (name) => Boolean(name) && customVarSet.has(String(name).toLowerCase()),
    matchesVariablePattern: (name) => Boolean(name) && isSensitiveName(name)
  };
};

const DEFAULT_POLICY = buildRedactionPolicy(null);

// --- Response body shape redaction ---------------------------------------

const REDACTED_TRUNCATED = '<truncated>';
const REDACTED_NULL = '<null>';
const REDACTED_BY_TYPE = {
  string: '<string>',
  number: '<number>',
  boolean: '<boolean>',
  bigint: '<bigint>'
};

const REDACTION_NOTICE = 'Values are placeholders (`<string>`, `<number>`, …). The shape, keys, and types are accurate but no real data is shown. Reference fields by path in generated code — do not hard-code these placeholders as literal values.';

const redactResponseValues = (data, depth = 0, maxDepth = 6) => {
  if (data === null || data === undefined) return REDACTED_NULL;
  if (depth >= maxDepth) return REDACTED_TRUNCATED;

  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    // Cap sample size — long arrays only need a few items to convey shape.
    const sampleSize = Math.min(data.length, 3);
    const out = data.slice(0, sampleSize).map((item) => redactResponseValues(item, depth + 1, maxDepth));
    if (data.length > sampleSize) out.push(`<${data.length - sampleSize} more items>`);
    return out;
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    const out = {};
    for (const key of keys.slice(0, 30)) {
      out[key] = redactResponseValues(data[key], depth + 1, maxDepth);
    }
    if (keys.length > 30) out['...'] = `<${keys.length - 30} more keys>`;
    return out;
  }

  return REDACTED_BY_TYPE[typeof data] || '<unknown>';
};

const RESPONSE_RAW_BODY_MAX_CHARS = 8000;

const formatResponseShape = (status, data, opts = {}) => {
  if (!status && data == null) return '';
  const policy = buildRedactionPolicy(opts.security);
  const parts = [];
  if (status) parts.push(`**Last Response Status:** ${status}`);

  if (data != null) {
    let parsed = data;
    let parsedOk = false;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data); parsedOk = true;
      } catch { parsedOk = false; }
    } else if (typeof data === 'object') {
      parsedOk = true;
    }

    if (parsedOk) {
      if (policy.redactResponse) {
        const redacted = redactResponseValues(parsed);
        if (redacted != null) {
          parts.push(`**Response Shape (values redacted — ${REDACTION_NOTICE}):**\n\`\`\`json\n${JSON.stringify(redacted, null, 2)}\n\`\`\``);
        }
      } else {
        // User opted out of response-value redaction — send the real body,
        // capped so a huge response doesn't blow the model's context window.
        const raw = JSON.stringify(parsed, null, 2);
        const truncated = raw.length > RESPONSE_RAW_BODY_MAX_CHARS;
        const shown = truncated ? `${raw.slice(0, RESPONSE_RAW_BODY_MAX_CHARS)}…` : raw;
        parts.push(`**Response Body:**\n\`\`\`json\n${shown}\n\`\`\`${truncated ? '\n\n(truncated)' : ''}`);
      }
    } else if (typeof data === 'string' && data.trim()) {
      if (policy.redactResponse) {
        parts.push(`**Response:** non-JSON, ${data.length} chars (call read_response() for the redacted view)`);
      } else {
        const truncated = data.length > RESPONSE_RAW_BODY_MAX_CHARS;
        const shown = truncated ? `${data.slice(0, RESPONSE_RAW_BODY_MAX_CHARS)}…` : data;
        parts.push(`**Response Body:**\n\`\`\`\n${shown}\n\`\`\`${truncated ? '\n\n(truncated)' : ''}`);
      }
    }
  }

  return parts.join('\n\n');
};

/**
 * Walk a JSON-shaped value and replace primitive values whose KEY is sensitive
 * (`password`, `*_token`, `secret`, etc.) with `<redacted>`. Keeps the shape
 * intact so the model can still see the body's structure and field names.
 *
 * Differs from `redactResponseValues` (which replaces ALL primitives with
 * type placeholders): we DO want the model to see non-sensitive request body
 * values so it can write code that references them correctly.
 */
const redactJsonBodyValues = (data, policy, depth = 0, maxDepth = 8) => {
  if (data === null || data === undefined) return data;
  if (depth >= maxDepth) return REDACTED_TRUNCATED;
  if (Array.isArray(data)) return data.map((item) => redactJsonBodyValues(item, policy, depth + 1, maxDepth));
  if (typeof data === 'object') {
    const out = {};
    for (const key of Object.keys(data)) {
      if (policy.isSensitiveKey(key)) {
        out[key] = REDACTED_VALUE;
      } else {
        out[key] = redactJsonBodyValues(data[key], policy, depth + 1, maxDepth);
      }
    }
    return out;
  }
  return data;
};

const redactJsonBodyString = (raw, policy = DEFAULT_POLICY) => {
  if (typeof raw !== 'string' || !raw.trim()) return raw || '';
  if (!policy.redactBody) return raw;
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(redactJsonBodyValues(parsed, policy), null, 2);
  } catch {
    // Not parseable JSON — return as-is. The renderer-side patterns + variable
    // redaction are the main line of defense for arbitrary text bodies.
    return raw;
  }
};

// --- Request context (method/url/headers/params/body/+response) ---------

/**
 * Format the renderer-supplied requestContext as Markdown for the model.
 *
 * @param {object} ctx { url, method, headers, params, body, docs,
 *                       responseStatus?, responseData? }
 * @param {object} opts
 *   includeBody      - include body (default true)
 *   bodyMaxChars     - truncate body to this many chars (default null = full)
 *   includeResponse  - inline the redacted response shape (default false)
 *   includeDocs      - include the request's docs field (default true)
 *   security         - user-configured redaction toggles (see
 *                      buildRedactionPolicy). Omit for strict defaults.
 */
const formatRequestContext = (ctx, opts = {}) => {
  const {
    includeBody = true,
    bodyMaxChars = null,
    includeResponse = false,
    includeDocs = true,
    security = null
  } = opts;
  if (!ctx) return '';
  const policy = buildRedactionPolicy(security);
  const maskHeader = (name, value) => (policy.redactHeaders && policy.isSensitiveHeader(name) ? REDACTED_VALUE : (value ?? ''));
  const maskFormField = (name, value) => (policy.redactBody && policy.isSensitiveKey(name) ? REDACTED_VALUE : (value ?? ''));
  const parts = [];

  if (ctx.url || ctx.method) {
    parts.push(`**Request:** ${ctx.method || 'GET'} ${ctx.url || ''}`);
  }

  const headers = (ctx.headers || []).filter((h) => h?.enabled && h?.name);
  if (headers.length) {
    parts.push(`**Headers:**\n${headers.map((h) => `  ${h.name}: ${maskHeader(h.name, h.value)}`).join('\n')}`);
  }

  const params = (ctx.params || []).filter((p) => p?.enabled && p?.name);
  const query = params.filter((p) => p.type === 'query' || !p.type);
  const pathParams = params.filter((p) => p.type === 'path');
  if (query.length) {
    parts.push(`**Query Parameters:**\n${query.map((p) => `  ${p.name}: ${maskHeader(p.name, p.value)}`).join('\n')}`);
  }
  if (pathParams.length) {
    parts.push(`**Path Parameters:**\n${pathParams.map((p) => `  ${p.name}: ${maskHeader(p.name, p.value)}`).join('\n')}`);
  }

  const body = ctx.body;
  if (includeBody && body && body.mode && body.mode !== 'none') {
    let content = '';
    switch (body.mode) {
      // JSON bodies often contain fields like `password`, `client_secret`,
      // `refresh_token`. Redact by key so the model sees the structure but
      // not the secret values.
      case 'json': content = redactJsonBodyString(body.json || '', policy); break;
      case 'text': content = body.text || ''; break;
      case 'xml': content = body.xml || ''; break;
      case 'sparql': content = body.sparql || ''; break;
      case 'formUrlEncoded': {
        const items = (body.formUrlEncoded || []).filter((p) => p.enabled);
        content = items.map((p) => `  ${p.name}: ${maskFormField(p.name, p.value)}`).join('\n');
        break;
      }
      case 'multipartForm': {
        const items = (body.multipartForm || []).filter((p) => p.enabled);
        content = items.map((p) => `  ${p.name}: ${p.type === 'file' ? '[file]' : maskFormField(p.name, p.value)}`).join('\n');
        break;
      }
      case 'graphql':
        content = body.graphql?.query || '';
        if (body.graphql?.variables) {
          // GraphQL variables are stored as a JSON string in Bruno — same
          // key-based redaction applies.
          content += `\n\nVariables:\n${redactJsonBodyString(body.graphql.variables, policy)}`;
        }
        break;
      default: content = '';
    }
    if (content) {
      const truncate = bodyMaxChars && content.length > bodyMaxChars;
      const shown = truncate ? content.slice(0, bodyMaxChars) + '…' : content;
      parts.push(`**Body (${body.mode}):**\n\`\`\`\n${shown}\n\`\`\``);
    }
  }

  if (includeResponse) {
    const responseStr = formatResponseShape(ctx.responseStatus, ctx.responseData, { security });
    if (responseStr) parts.push(responseStr);
  }

  if (includeDocs && ctx.docs && typeof ctx.docs === 'string' && ctx.docs.trim()) {
    parts.push(`**Documentation:**\n${ctx.docs.trim()}`);
  }

  return parts.join('\n\n');
};

// --- Variables (env / global / collection / folder / request / runtime) -

/**
 * Variable record shape (what the renderer sends over IPC):
 *   { name: string, value: string | null, scope: string, secret: boolean }
 *
 * - `scope` is informational ('env', 'global', 'collection', 'folder',
 *   'request', 'runtime', 'process', 'oauth2', ...). Used only for the
 *   short list shown to the model.
 * - `secret: true` means the value is omitted from the renderer's payload
 *   too — never trust the value field on a secret. The backend re-masks.
 */

const isSecretVariable = (v, policy = DEFAULT_POLICY) => {
  if (!v) return false;
  // `secret: true` is a hard promise from the renderer's variable
  // pipeline - always honor it, even when the pattern-match toggle is off.
  if (v.secret) return true;
  // Custom-listed names redact unconditionally, the user opted in explicitly.
  if (policy.isCustomVariable(v.name)) return true;
  // Built-in pattern matches only apply when the toggle is on.
  if (!policy.redactVariables) return false;
  return policy.matchesVariablePattern(v.name);
};

const variableValueForModel = (v, policy) => {
  if (!v) return '';
  if (isSecretVariable(v, policy)) return REDACTED_VALUE;
  if (v.value == null) return '';
  return String(v.value);
};

const VAR_NAMES_PREVIEW_PER_SCOPE = 25;

/**
 * Inline preview shown in the prompt. Names + a small per-scope sample so
 * the model knows what's available without us dumping 500 env vars.
 */
const formatVariablesList = (variables, opts = {}) => {
  if (!Array.isArray(variables) || !variables.length) return '';
  const policy = buildRedactionPolicy(opts.security);

  const byScope = new Map();
  for (const v of variables) {
    if (!v || !v.name) continue;
    const scope = v.scope || 'unknown';
    if (!byScope.has(scope)) byScope.set(scope, []);
    byScope.get(scope).push(v);
  }

  const lines = [];
  for (const [scope, list] of byScope.entries()) {
    const total = list.length;
    const preview = list.slice(0, VAR_NAMES_PREVIEW_PER_SCOPE);
    const more = total > preview.length ? ` (+${total - preview.length} more — use search_variables to find them)` : '';
    const names = preview
      .map((v) => (isSecretVariable(v, policy) ? `${v.name} (secret)` : v.name))
      .join(', ');
    lines.push(`- ${scope} (${total}): ${names}${more}`);
  }
  return lines.join('\n');
};

const SEARCH_LIMIT = 50;

/**
 * Returns `{ items, totalMatched, limit }`. `totalMatched` is the number of
 * variables that matched the query BEFORE truncation, so the caller can tell
 * the model when there are more matches than were returned.
 */
const searchVariables = (variables, rawQuery, limit = SEARCH_LIMIT) => {
  if (!Array.isArray(variables) || !variables.length) {
    return { items: [], totalMatched: 0, limit };
  }
  const query = String(rawQuery || '').toLowerCase().trim();
  const filtered = query
    ? variables.filter((v) => v?.name && v.name.toLowerCase().includes(query))
    : variables.slice();
  return { items: filtered.slice(0, limit), totalMatched: filtered.length, limit };
};

const formatSearchVariablesResult = ({ items, totalMatched, limit }, query, opts = {}) => {
  if (!items.length) {
    return query
      ? `No variables match "${query}".`
      : 'No variables defined for this collection/environment.';
  }
  const policy = buildRedactionPolicy(opts.security);
  const lines = items.map((v) => {
    const value = variableValueForModel(v, policy);
    const tags = [v.scope || 'unknown'];
    if (isSecretVariable(v, policy)) tags.push('secret');
    return `  ${v.name} = ${value}    [${tags.join(', ')}]`;
  });
  const heading = query
    ? `Found ${items.length}${totalMatched > items.length ? ` of ${totalMatched}` : ''} variable(s) matching "${query}":`
    : `Variables (${items.length}${totalMatched > items.length ? ` of ${totalMatched}` : ''}):`;
  const trailer = totalMatched > items.length
    ? `\n\n(${totalMatched - items.length} more match — narrow the query to see them.)`
    : '';
  return `${heading}\n${lines.join('\n')}${trailer}`;
};

module.exports = {
  // patterns + helpers
  SENSITIVE_HEADER_PATTERNS,
  REDACTED_VALUE,
  REDACTION_NOTICE,
  isSensitiveName,
  maskValue,
  buildRedactionPolicy,
  // response shape
  redactResponseValues,
  formatResponseShape,
  // request context
  formatRequestContext,
  redactJsonBodyString,
  // variables
  isSecretVariable,
  formatVariablesList,
  searchVariables,
  formatSearchVariablesResult
};
