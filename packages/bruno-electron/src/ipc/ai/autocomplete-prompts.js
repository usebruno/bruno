/**
 * Prompts for inline (ghost-text) autocomplete in script editors.
 *
 * Separate from script-prompts.js because the surfaces differ:
 *  - script-prompts.js: full-script generation from a user instruction.
 *  - this file: cursor-position completion from prefix/suffix, no user
 *    instruction. Output is appended verbatim at the cursor.
 */

const API_BLOCKS = {
  bru: `bru:    env/global/collection/folder/request/runtime vars — get/set/has/delete,
        interpolate(strOrObj), sleep(ms), sendRequest(cfg), setNextRequest(name),
        cookies, utils.minifyJson/Xml, getEnvName, getCollectionName, cwd`,
  req: `req:    url, method, headers, body, timeout. getUrl/setUrl, getHeader/setHeader,
        getBody/setBody, getMethod/setMethod, getTimeout/setTimeout.`,
  res: `res:    status, headers, body, responseTime. getStatus, getStatusText,
        getHeader, getHeaders, getBody, getResponseTime, getSize. res('json.path')
        for JSONPath-style queries.`,
  test: `test/expect:  Chai-style assertions inside test("name", () => { ... }) blocks.`
};

const API_BLOCKS_BY_SCRIPT_TYPE = {
  'pre-request': ['bru', 'req'],
  'post-response': ['bru', 'req', 'res'],
  'tests': ['bru', 'req', 'res', 'test']
};

const buildApiSummary = (scriptType) => {
  const blocks = API_BLOCKS_BY_SCRIPT_TYPE[scriptType] || Object.keys(API_BLOCKS);
  return `## Bruno runtime APIs (available inside scripts)

${blocks.map((block) => API_BLOCKS[block]).join('\n\n')}`;
};

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

${buildApiSummary(scriptType)}

## Context for ${scriptType}
${context}

## Output rules

- Continue the code from the cursor marker \`<CURSOR>\` exactly where it is.
- Output ONLY the characters that should be inserted at the cursor — no markdown, no fences, no commentary, no leading newline.
- Match the surrounding indentation and quote style.
- If the cursor is at the end of a \`//\` comment line and you are generating CODE (not finishing the comment's text), begin your output with a newline — anything emitted on the comment line itself would be commented out. A comment like \`// test that status is 200\` is an instruction: put the implementing code on the following line(s).
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

const { redactJsonBodyString, buildRedactionPolicy } = require('./context');

const formatRequestContext = (ctx, security) => {
  if (!ctx) return '';
  const policy = buildRedactionPolicy(security);
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
    if (body.mode === 'json') bodyText = redactJsonBodyString(body.json || '', policy);
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

const buildUserPrompt = ({ prefix, suffix, scriptType, requestContext, variableNames, siblingScripts, security }) => {
  // Keep recent context in the prefix (last 80 lines) and a short forward window (30 lines).
  // Cloud LLMs can handle more, but trimming keeps latency low and the model focused.
  const trimmedPrefix = truncateLines(prefix || '', 80);
  const trimmedSuffix = truncateLinesFromStart(suffix || '', 30);

  const sections = [];

  const reqStr = formatRequestContext(requestContext, security);
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

// --- Comment-line guard ----------------------------------------------------
// Models often ignore the "start with a newline after a comment" rule and
// emit code directly at the cursor, which lands inside the comment. Detect
// the case deterministically and prepend the newline ourselves.

const CODE_START_RE = /^\s*(?:const\s|let\s|var\s|function[\s(]|async\s|await\s|if\s*\(|for\s*\(|while\s*\(|switch\s*\(|try\s*\{|return[\s;(]|throw\s|new\s|test\s*\(|describe\s*\(|expect\s*\(|bru\.|req\.|res[.(]|console\.|JSON\.|Object\.|Array\.|Promise\.|[{}]|[\w$]+\s*\(|[\w$]+\s*[+\-*/]?=[^=])/;

// Strip string literals so `//` inside a URL ('https://…') isn't mistaken
// for a comment marker.
const stripStringLiterals = (line) =>
  line.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""');

/**
 * If the cursor sits after a `//` comment and the suggestion starts with code,
 * prepend a newline so the code lands on its own line instead of inside the
 * comment. Suggestions that continue the comment's prose are left untouched.
 */
const ensureNewlineAfterComment = (prefix, suggestion) => {
  if (!suggestion || /^[\r\n]/.test(suggestion)) return suggestion;
  const lastLine = String(prefix || '').split('\n').pop();
  if (!stripStringLiterals(lastLine).includes('//')) return suggestion;
  if (!CODE_START_RE.test(suggestion)) return suggestion;
  return '\n' + suggestion;
};

const RES_API_USAGE_RE = /(?<![\w$.?])res\s*\??\s*[.([]/;
const RES_BINDING_RE = /\b(?:const|let|var)\s+res\b|[(,]\s*res\s*[,)=]|\bres\s*=>/;
const TRAILING_MEMBER_EXPR_RE = /[\w$.?[\]()]*$/;
const TRAILING_WORD_RE = /[\w$]+$/;
const PRECEDING_WORD_RE = /([\w$]+)\s+$/;
const LEADING_WORD_RE = /^[\w$]+/;

const PREFIX_TAIL_LIMIT = 512;
const prefixTail = (prefix) => prefix.slice(-PREFIX_TAIL_LIMIT);

const stripDisallowedApis = (suggestion, scriptType, prefix = '') => {
  if (!suggestion || scriptType !== 'pre-request') return suggestion;
  if (RES_BINDING_RE.test(prefix)) return suggestion;
  const trailingExpr = (prefixTail(prefix).match(TRAILING_MEMBER_EXPR_RE) || [''])[0];
  if (RES_API_USAGE_RE.test(suggestion) || RES_API_USAGE_RE.test(trailingExpr + suggestion)) return '';
  return suggestion;
};

const stripTypedPrefixOverlap = (prefix, suggestion) => {
  if (!prefix || !suggestion) return suggestion;
  const trailingExpr = (prefixTail(prefix).match(TRAILING_MEMBER_EXPR_RE) || [''])[0];
  for (let overlapLen = Math.min(trailingExpr.length, suggestion.length); overlapLen > 0; overlapLen--) {
    if (trailingExpr.endsWith(suggestion.slice(0, overlapLen))) return suggestion.slice(overlapLen);
  }
  return suggestion;
};

const duplicatesPrecedingWord = (prefix, suggestion) => {
  if (!prefix || !suggestion) return false;
  const tail = prefixTail(prefix);
  const pendingWord = (tail.match(TRAILING_WORD_RE) || [''])[0];
  if (!pendingWord) return false;
  const beforePending = tail.slice(0, tail.length - pendingWord.length);
  const preceding = beforePending.match(PRECEDING_WORD_RE);
  if (!preceding) return false;
  const head = (suggestion.match(LEADING_WORD_RE) || [''])[0];
  if (!head) return false;
  return (pendingWord + head).endsWith(preceding[1]);
};

const sanitizeSuggestion = ({ text, prefix, scriptType }) => {
  const cleaned = cleanSuggestion(text || '');
  const allowed = stripDisallowedApis(cleaned, scriptType, prefix);
  const deduped = stripTypedPrefixOverlap(prefix, allowed);
  if (duplicatesPrecedingWord(prefix, deduped)) return '';
  return ensureNewlineAfterComment(prefix, deduped);
};

module.exports = {
  buildSystemPrompt,
  buildUserPrompt,
  STOP_SEQUENCES,
  cleanSuggestion,
  ensureNewlineAfterComment,
  stripDisallowedApis,
  stripTypedPrefixOverlap,
  duplicatesPrecedingWord,
  sanitizeSuggestion
};
