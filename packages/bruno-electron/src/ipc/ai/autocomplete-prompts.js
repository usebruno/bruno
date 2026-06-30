/**
 * Prompts for inline (ghost-text) autocomplete in script editors.
 *
 * Separate from script-prompts.js because the surfaces differ:
 *  - script-prompts.js: full-script generation from a user instruction.
 *  - this file: cursor-position completion from prefix/suffix, no user
 *    instruction. Output is appended verbatim at the cursor.
 */

const BRUNO_API_SUMMARY = `## Bruno runtime APIs (available inside scripts)

bru:    env/global/collection/folder/request/runtime vars — get/set/has/delete,
        interpolate(strOrObj), sleep(ms), sendRequest(cfg), setNextRequest(name),
        cookies, utils.minifyJson/Xml, getEnvName, getCollectionName, cwd

req:    url, method, headers, body, timeout. getUrl/setUrl, getHeader/setHeader,
        getBody/setBody, getMethod/setMethod, getTimeout/setTimeout. Available in
        pre-request, post-response and tests.

res:    status, headers, body, responseTime. getStatus, getStatusText,
        getHeader, getHeaders, getBody, getResponseTime, getSize. res('json.path')
        for JSONPath-style queries. Available in post-response and tests.

test/expect:  Chai-style assertions inside test("name", () => { ... }) blocks.
              Available in tests only.`;

const SCRIPT_CONTEXTS = {
  'tests': `Tests run AFTER the response. Globals: bru, req, res, test, expect. Assertions go inside test("name", () => { ... }) blocks. Don't call bru.setEnvVar / setVar — keep tests pure.`,
  'pre-request': `Pre-request scripts run BEFORE the HTTP request is sent. Globals: bru, req. res is NOT available. Don't use test() / expect() — those belong in the Tests tab.`,
  'post-response': `Post-response scripts run AFTER the response is received, before tests. Globals: bru, req, res. Don't use test() / expect() — those belong in the Tests tab.`
};

const SCRIPT_TYPE_LABELS = {
  'tests': 'a Bruno tests script',
  'pre-request': 'a Bruno pre-request script',
  'post-response': 'a Bruno post-response script'
};

const buildSystemPrompt = (scriptType) => {
  const label = SCRIPT_TYPE_LABELS[scriptType] || 'a Bruno script';
  const context = SCRIPT_CONTEXTS[scriptType] || '';
  return `You are an inline code-completion engine for ${label}.

${BRUNO_API_SUMMARY}

## Context for ${scriptType}
${context}

## Output rules

- Continue the code from the cursor marker \`<CURSOR>\` exactly where it is.
- Output ONLY the characters that should be inserted at the cursor — no markdown, no fences, no commentary, no leading newline.
- Match the surrounding indentation and quote style.
- Stop at a natural break (end of statement, end of block) — do not rewrite code that already exists after the cursor.
- Prefer real variable names from the provided lists over placeholders.
- Return an empty string if you have nothing useful to add.`;
};

const truncateLines = (text, maxLines) => {
  if (!text) return '';
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return lines.slice(-maxLines).join('\n');
};

const truncateLinesFromStart = (text, maxLines) => {
  if (!text) return '';
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join('\n');
};

const formatRequestContext = (ctx) => {
  if (!ctx) return '';
  const parts = [];
  if (ctx.url || ctx.method) {
    parts.push(`${ctx.method || 'GET'} ${ctx.url || ''}`.trim());
  }

  const headers = (ctx.headers || []).filter((h) => h?.enabled && h?.name).slice(0, 12);
  if (headers.length) {
    parts.push(`Headers: ${headers.map((h) => h.name).join(', ')}`);
  }

  const body = ctx.body;
  if (body && body.mode && body.mode !== 'none') {
    let bodyText = '';
    if (body.mode === 'json') bodyText = body.json || '';
    else if (body.mode === 'text') bodyText = body.text || '';
    else if (body.mode === 'xml') bodyText = body.xml || '';
    else if (body.mode === 'graphql') bodyText = body.graphql?.query || '';
    if (bodyText) {
      const trimmed = bodyText.slice(0, 400);
      parts.push(`Body (${body.mode}):\n${trimmed}${bodyText.length > 400 ? '…' : ''}`);
    }
  }

  return parts.join('\n');
};

const formatVariableNames = (vars) => {
  if (!vars || typeof vars !== 'object') return '';
  const entries = Object.entries(vars)
    .filter(([, names]) => Array.isArray(names) && names.length)
    .map(([scope, names]) => `${scope}: ${names.slice(0, 40).join(', ')}`);
  return entries.join('\n');
};

const formatSiblingScripts = (siblings) => {
  if (!Array.isArray(siblings) || !siblings.length) return '';
  return siblings
    .map((s) => {
      if (!s || !s.script || !s.script.trim()) return null;
      const code = s.script.slice(0, 400);
      return `// ${s.name || 'sibling'} (${s.type || 'script'})\n${code}${s.script.length > 400 ? '\n// …' : ''}`;
    })
    .filter(Boolean)
    .join('\n\n');
};

const buildUserPrompt = ({ prefix, suffix, scriptType, requestContext, variableNames, siblingScripts }) => {
  // Keep recent context in the prefix (last 80 lines) and a short forward window (30 lines).
  // Cloud LLMs can handle more, but trimming keeps latency low and the model focused.
  const trimmedPrefix = truncateLines(prefix || '', 80);
  const trimmedSuffix = truncateLinesFromStart(suffix || '', 30);

  const sections = [];

  const reqStr = formatRequestContext(requestContext);
  if (reqStr) sections.push(`### Request being scripted\n${reqStr}`);

  const varStr = formatVariableNames(variableNames);
  if (varStr) sections.push(`### Available variable names (use these in bru.getEnvVar / bru.getVar / interpolate)\n${varStr}`);

  const siblingStr = formatSiblingScripts(siblingScripts);
  if (siblingStr) sections.push(`### Sibling ${scriptType} scripts in the same collection (style reference)\n${siblingStr}`);

  sections.push(`### Cursor\n\`\`\`javascript\n${trimmedPrefix}<CURSOR>${trimmedSuffix}\n\`\`\``);
  sections.push('Continue from <CURSOR>. Output only the insertion.');

  return sections.join('\n\n');
};

// Stop sequences for cloud chat models — cut suggestions once they wander
// into prose or start a new top-level construct.
const STOP_SEQUENCES = ['```', '\n\ntest(', '\n\n// User:', '\n\nAssistant:'];

// Strip leftover fences, language tags, and quote/prose preambles a model may
// emit despite the prompt. Never collapses internal whitespace — keeps indent.
const cleanSuggestion = (raw) => {
  if (!raw) return '';
  let out = raw;
  // Drop leading fences and language tag
  out = out.replace(/^```[\w-]*\n?/, '');
  // Drop trailing fence
  out = out.replace(/\n?```\s*$/, '');
  // Drop "Here is..." style preambles on a single leading line
  out = out.replace(/^(?:Here(?:'s| is| are)[^\n]*\n)/i, '');
  // If model echoed the <CURSOR> marker, keep only what comes after it
  const cursorIdx = out.indexOf('<CURSOR>');
  if (cursorIdx >= 0) out = out.slice(cursorIdx + '<CURSOR>'.length);
  return out;
};

module.exports = {
  buildSystemPrompt,
  buildUserPrompt,
  STOP_SEQUENCES,
  cleanSuggestion
};
