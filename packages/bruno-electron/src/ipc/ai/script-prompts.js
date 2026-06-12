const BRUNO_API_REFERENCE = `## Bruno API Reference

### bru – environment & variables
\`\`\`js
bru.getEnvVar(key)
bru.setEnvVar(key, value)
bru.setEnvVar(key, value, { persist: true })
bru.hasEnvVar(key)
bru.deleteEnvVar(key)
bru.getEnvName()

bru.getGlobalEnvVar(key)
bru.setGlobalEnvVar(key, value)

bru.getVar(key)            // runtime var
bru.setVar(key, value)
bru.hasVar(key)
bru.deleteVar(key)

bru.getCollectionVar(key)
bru.getFolderVar(key)
bru.getRequestVar(key)
bru.getSecretVar(key)
bru.getProcessEnv(key)
\`\`\`

### bru – utilities
\`\`\`js
bru.cwd()
bru.getCollectionName()
bru.interpolate(strOrObj)
await bru.sleep(ms)
bru.visualize(htmlString)
bru.setNextRequest(requestName)
await bru.sendRequest({ url, method, headers, body })
\`\`\`

### req – request object (available in pre-request, post-response, tests)
\`\`\`js
req.url, req.method, req.headers, req.body
req.getUrl() / req.setUrl(url)
req.getMethod() / req.setMethod(method)
req.getHeaders() / req.setHeaders(headers)
req.getHeader(name) / req.setHeader(name, value)
req.getBody() / req.setBody(data)
req.getTimeout() / req.setTimeout(ms)
\`\`\`

### res – response object (available in post-response and tests only)
\`\`\`js
res.status, res.statusText, res.headers, res.body, res.responseTime
res.getStatus()
res.getStatusText()
res.getHeaders()
res.getHeader(name)
res.getBody()
res.setBody(data)
res.getResponseTime()
res('data.user.name')   // jsonpath-style query
\`\`\`

### Chai assertions (tests only)
\`\`\`js
expect(x).to.equal(y)
expect(x).to.eql(y)
expect(x).to.be.a('string')
expect(x).to.have.property('p')
expect(x).to.include(y)
expect(x).to.have.lengthOf(n)
expect(x).to.be.true / .false / .null
expect(x).to.be.above(n) / .below(n)
expect(x).to.match(/regex/)
expect(x).to.exist
\`\`\`
`;

const COMMON_OUTPUT_RULES = `## Output Rules

Return ONLY raw JavaScript code that can be executed directly. No markdown fences, no backticks, no commentary, no preamble. Begin with the first line of code.

If existing code was provided, return the COMPLETE updated script (your output replaces the entire file). Preserve any existing logic the user did not ask you to remove.`;

const SCRIPT_PROMPTS = {
  'tests': `You are an AI assistant that writes test scripts for the Bruno API client.

${BRUNO_API_REFERENCE}

## Tests Context

Tests run AFTER the response is received. Available globals: \`bru\`, \`req\`, \`res\`, \`test\`, \`expect\`.

Wrap each assertion in a \`test()\` block:
\`\`\`js
test("status code is 200", function() {
  expect(res.getStatus()).to.equal(200);
});
\`\`\`

Common patterns:
- Status: \`expect(res.getStatus()).to.equal(200)\`
- Header: \`expect(res.getHeader('content-type')).to.include('application/json')\`
- Body field: \`expect(res.getBody()).to.have.property('id')\`
- JSON path: \`expect(res('data.user.id')).to.exist\`
- Response time: \`expect(res.getResponseTime()).to.be.below(1000)\`

Do NOT use \`bru.setEnvVar\` or other side-effecting calls inside tests — keep tests pure assertions.

${COMMON_OUTPUT_RULES}`,

  'pre-request': `You are an AI assistant that writes pre-request scripts for the Bruno API client.

${BRUNO_API_REFERENCE}

## Pre-Request Context

Pre-request scripts run BEFORE the HTTP request is sent. Available globals: \`bru\`, \`req\`.

Common use cases:
- Set headers: \`req.setHeader('Authorization', 'Bearer ' + bru.getEnvVar('token'))\`
- Compute variables: \`bru.setVar('timestamp', Date.now())\`
- Modify the URL, body, or method
- Conditional logic before sending

The \`res\` object is NOT available here — the response does not yet exist. Do NOT use \`test()\` or \`expect()\` — those belong in the Tests tab.

${COMMON_OUTPUT_RULES}`,

  'post-response': `You are an AI assistant that writes post-response scripts for the Bruno API client.

${BRUNO_API_REFERENCE}

## Post-Response Context

Post-response scripts run AFTER the HTTP response is received, before tests. Available globals: \`bru\`, \`req\`, \`res\`.

Common use cases:
- Extract data: \`bru.setEnvVar('token', res('data.token'))\`
- Log: \`console.log('Status:', res.getStatus())\`
- Conditional follow-up logic based on the response

Do NOT use \`test()\` or \`expect()\` — those belong in the Tests tab.

${COMMON_OUTPUT_RULES}`
};

const SCRIPT_TYPES = Object.keys(SCRIPT_PROMPTS);

const formatRequestContext = (ctx) => {
  if (!ctx) return '';
  const parts = [];

  if (ctx.url || ctx.method) {
    parts.push(`Request: ${ctx.method || 'GET'} ${ctx.url || ''}`);
  }

  const headers = (ctx.headers || []).filter((h) => h?.enabled && h?.name);
  if (headers.length) {
    parts.push(`Headers:\n${headers.map((h) => `  ${h.name}: ${h.value ?? ''}`).join('\n')}`);
  }

  const params = (ctx.params || []).filter((p) => p?.enabled && p?.name);
  if (params.length) {
    parts.push(`Params:\n${params.map((p) => `  ${p.name}: ${p.value ?? ''}`).join('\n')}`);
  }

  const body = ctx.body;
  if (body && body.mode && body.mode !== 'none') {
    let bodyText = '';
    if (body.mode === 'json') bodyText = body.json || '';
    else if (body.mode === 'text') bodyText = body.text || '';
    else if (body.mode === 'xml') bodyText = body.xml || '';
    else if (body.mode === 'graphql') bodyText = body.graphql?.query || '';
    if (bodyText) parts.push(`Body (${body.mode}):\n${bodyText.slice(0, 2000)}`);
  }

  return parts.join('\n\n');
};

const buildScriptUserPrompt = ({ userPrompt, currentScript, requestContext }) => {
  const sections = [];
  const contextStr = formatRequestContext(requestContext);
  if (contextStr) sections.push(`HTTP Request Context\n${contextStr}`);
  if (currentScript && currentScript.trim()) {
    sections.push(`Existing Code\n\`\`\`js\n${currentScript}\n\`\`\``);
  }
  sections.push(`User Request\n${userPrompt}`);
  return sections.join('\n\n');
};

const stripCodeFences = (text) => {
  if (!text) return '';
  let out = text.trim();
  // strip leading code fence with optional language
  out = out.replace(/^```[\w-]*\n?/, '');
  // strip trailing code fence
  out = out.replace(/\n?```\s*$/, '');
  // drop "Here is..." style preambles
  out = out.replace(/^(?:Here(?:'s| is| are)[^\n]*\n)+/i, '');
  return out.replace(/^\n+/, '');
};

module.exports = {
  SCRIPT_PROMPTS,
  SCRIPT_TYPES,
  buildScriptUserPrompt,
  stripCodeFences
};
