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

const formatResponseShape = (status, data) => {
  if (!status && data == null) return '';
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
      const redacted = redactResponseValues(parsed);
      if (redacted != null) {
        parts.push(`**Response Shape (values redacted — ${REDACTION_NOTICE}):**\n\`\`\`json\n${JSON.stringify(redacted, null, 2)}\n\`\`\``);
      }
    } else if (typeof data === 'string' && data.trim()) {
      parts.push(`**Response:** non-JSON, ${data.length} chars (call read_response() for the redacted view)`);
    }
  }

  return parts.join('\n\n');
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
 */
const formatRequestContext = (ctx, opts = {}) => {
  const {
    includeBody = true,
    bodyMaxChars = null,
    includeResponse = false,
    includeDocs = true
  } = opts;
  if (!ctx) return '';
  const parts = [];

  if (ctx.url || ctx.method) {
    parts.push(`**Request:** ${ctx.method || 'GET'} ${ctx.url || ''}`);
  }

  const headers = (ctx.headers || []).filter((h) => h?.enabled && h?.name);
  if (headers.length) {
    parts.push(`**Headers:**\n${headers.map((h) => `  ${h.name}: ${maskValue(h.name, h.value ?? '')}`).join('\n')}`);
  }

  const params = (ctx.params || []).filter((p) => p?.enabled && p?.name);
  const query = params.filter((p) => p.type === 'query' || !p.type);
  const pathParams = params.filter((p) => p.type === 'path');
  if (query.length) {
    parts.push(`**Query Parameters:**\n${query.map((p) => `  ${p.name}: ${maskValue(p.name, p.value ?? '')}`).join('\n')}`);
  }
  if (pathParams.length) {
    parts.push(`**Path Parameters:**\n${pathParams.map((p) => `  ${p.name}: ${maskValue(p.name, p.value ?? '')}`).join('\n')}`);
  }

  const body = ctx.body;
  if (includeBody && body && body.mode && body.mode !== 'none') {
    let content = '';
    switch (body.mode) {
      case 'json': content = body.json || ''; break;
      case 'text': content = body.text || ''; break;
      case 'xml': content = body.xml || ''; break;
      case 'sparql': content = body.sparql || ''; break;
      case 'formUrlEncoded': {
        const items = (body.formUrlEncoded || []).filter((p) => p.enabled);
        content = items.map((p) => `  ${p.name}: ${maskValue(p.name, p.value ?? '')}`).join('\n');
        break;
      }
      case 'multipartForm': {
        const items = (body.multipartForm || []).filter((p) => p.enabled);
        content = items.map((p) => `  ${p.name}: ${p.type === 'file' ? '[file]' : maskValue(p.name, p.value ?? '')}`).join('\n');
        break;
      }
      case 'graphql':
        content = body.graphql?.query || '';
        if (body.graphql?.variables) content += `\n\nVariables:\n${body.graphql.variables}`;
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
    const responseStr = formatResponseShape(ctx.responseStatus, ctx.responseData);
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

const isSecretVariable = (v) => Boolean(v && (v.secret || isSensitiveName(v.name)));

const variableValueForModel = (v) => {
  if (!v) return '';
  if (isSecretVariable(v)) return REDACTED_VALUE;
  if (v.value == null) return '';
  return String(v.value);
};

const VAR_NAMES_PREVIEW_PER_SCOPE = 25;

/**
 * Inline preview shown in the prompt. Names + a small per-scope sample so
 * the model knows what's available without us dumping 500 env vars.
 */
const formatVariablesList = (variables) => {
  if (!Array.isArray(variables) || !variables.length) return '';

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
      .map((v) => (isSecretVariable(v) ? `${v.name} (secret)` : v.name))
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

const formatVariableLine = (v) => {
  const value = variableValueForModel(v);
  const tags = [v.scope || 'unknown'];
  if (isSecretVariable(v)) tags.push('secret');
  return `  ${v.name} = ${value}    [${tags.join(', ')}]`;
};

const formatSearchVariablesResult = ({ items, totalMatched, limit }, query) => {
  if (!items.length) {
    return query
      ? `No variables match "${query}".`
      : 'No variables defined for this collection/environment.';
  }
  const lines = items.map(formatVariableLine);
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
  // response shape
  redactResponseValues,
  formatResponseShape,
  // request context
  formatRequestContext,
  // variables
  isSecretVariable,
  formatVariablesList,
  searchVariables,
  formatSearchVariablesResult
};
