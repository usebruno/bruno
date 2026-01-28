/**
 * AI Prompt Templates for Bruno
 * Contains prompts for generating tests and improving scripts
 * with complete Bruno API reference
 */

const BRUNO_API_REFERENCE = `
## Bruno API Reference

### bru object - Bruno utilities and variables
- bru.cwd() - Get collection path
- bru.getEnvName() - Get current environment name
- bru.getEnvVar(key) - Get environment variable value
- bru.setEnvVar(key, value, options) - Set environment variable (options: { persist: boolean })
- bru.hasEnvVar(key) - Check if environment variable exists
- bru.deleteEnvVar(key) - Delete environment variable
- bru.getVar(key) - Get runtime variable value
- bru.setVar(key, value) - Set runtime variable
- bru.hasVar(key) - Check if runtime variable exists
- bru.deleteVar(key) - Delete runtime variable
- bru.deleteAllVars() - Delete all runtime variables
- bru.getCollectionVar(key) - Get collection variable
- bru.getFolderVar(key) - Get folder variable
- bru.getRequestVar(key) - Get request variable
- bru.getGlobalEnvVar(key) - Get global environment variable
- bru.setGlobalEnvVar(key, value) - Set global environment variable
- bru.getProcessEnv(key) - Get process.env variable
- bru.interpolate(strOrObj) - Interpolate {{variables}} in string/object
- bru.sleep(ms) - Async sleep for specified milliseconds
- bru.getCollectionName() - Get collection name
- bru.runner.skipRequest() - Skip current request in collection runner
- bru.runner.stopExecution() - Stop runner execution
- bru.runner.setNextRequest(requestName) - Set next request to run
- bru.cookies.jar() - Get cookie jar for custom cookie handling
- bru.utils.minifyJson(json) - Minify JSON string/object
- bru.utils.minifyXml(xml) - Minify XML string
- bru.sendRequest(request) - Send an HTTP request programmatically

### req object - Request manipulation (pre-request scripts)
- req.url - Request URL (read-only shorthand)
- req.method - HTTP method (read-only shorthand)
- req.headers - Request headers object
- req.body - Parsed request body (JSON auto-parsed)
- req.timeout - Request timeout
- req.name - Request name
- req.tags - Request tags array
- req.getUrl() - Get request URL
- req.setUrl(url) - Set request URL
- req.getMethod() - Get HTTP method
- req.setMethod(method) - Set HTTP method (GET, POST, PUT, DELETE, etc.)
- req.getHeaders() - Get all headers
- req.setHeaders(headers) - Set all headers
- req.getHeader(name) - Get specific header value
- req.setHeader(name, value) - Set specific header
- req.getBody(options) - Get body (options: { raw: true } for raw body)
- req.setBody(data, options) - Set request body (options: { raw: true })
- req.getTimeout() - Get timeout value
- req.setTimeout(ms) - Set timeout in milliseconds
- req.setMaxRedirects(n) - Set maximum redirects
- req.getAuthMode() - Get auth type ('oauth2', 'bearer', 'basic', 'awsv4', 'digest', 'wsse', 'none')
- req.getName() - Get request name
- req.getTags() - Get request tags
- req.getExecutionMode() - Get execution mode ('single' or 'runner')
- req.disableParsingResponseJson() - Disable automatic JSON parsing of response
- req.onFail(callback) - Set callback for request failure

### res object - Response data (post-response scripts only)
- res.status - Response status code (e.g., 200, 404)
- res.statusText - Response status text (e.g., 'OK', 'Not Found')
- res.headers - Response headers object
- res.body - Response body (parsed JSON if applicable)
- res.responseTime - Response time in milliseconds
- res.url - Final response URL (after redirects)
- res.getStatus() - Get status code
- res.getStatusText() - Get status text
- res.getHeader(name) - Get specific response header
- res.getHeaders() - Get all response headers
- res.getBody() - Get response body
- res.setBody(data) - Modify response body
- res.getResponseTime() - Get response time in ms
- res.getUrl() - Get final URL
- res.getSize() - Get { header, body, total } sizes in bytes
- res.getDataBuffer() - Get raw data buffer
- res('path.to.field') - Query body with dot notation (e.g., res('user.name'))

### Testing API (post-response scripts)
IMPORTANT: All assertions MUST be wrapped inside a test() function call. Never use expect() outside of test().

Syntax:
test("description of what you're testing", function() {
  expect(value).to.equal(expected);
});

Example tests:
test("should return status 200", function() {
  expect(res.status).to.equal(200);
});

test("should return user data", function() {
  expect(res.body).to.have.property('id');
  expect(res.body).to.have.property('name');
});

test("should respond within 500ms", function() {
  expect(res.responseTime).to.be.below(500);
});

Common assertions (always inside test()):
- expect(value).to.equal(expected) - Assert equality
- expect(value).to.not.equal(value) - Assert inequality
- expect(value).to.be.true - Assert truthy
- expect(value).to.be.false - Assert falsy
- expect(value).to.be.null - Assert null
- expect(value).to.be.undefined - Assert undefined
- expect(value).to.be.above(num) - Assert greater than
- expect(value).to.be.below(num) - Assert less than
- expect(value).to.be.at.least(num) - Assert greater than or equal
- expect(value).to.be.at.most(num) - Assert less than or equal
- expect(array).to.include(item) - Assert array includes item
- expect(string).to.include(substring) - Assert string includes substring
- expect(obj).to.have.property(name) - Assert object has property
- expect(obj).to.have.property(name, value) - Assert property with value
- expect(array).to.have.length(n) - Assert array length
- expect(value).to.be.a('string') - Assert type
- expect(value).to.be.an('array') - Assert type
- expect(obj).to.deep.equal(expected) - Deep equality
- expect(func).to.throw(Error) - Assert throws error
`;

/**
 * Generate prompt for creating tests based on request/response
 */
const generateTestsPrompt = (request, response, currentScript = '') => {
  const existingScriptContext = currentScript?.trim()
    ? `\n\nExisting script that tests should be added to:\n\`\`\`javascript\n${currentScript}\n\`\`\``
    : '';

  return `You are an expert at writing JavaScript tests for API requests using Bruno's testing framework.

${BRUNO_API_REFERENCE}

Given the following API request and response, generate comprehensive tests.

## Request Details
- Method: ${request.method || 'GET'}
- URL: ${request.url || ''}
- Headers: ${JSON.stringify(request.headers || {}, null, 2)}
- Body: ${JSON.stringify(request.body || null, null, 2)}

## Response Details
- Status: ${response.status || 'N/A'}
- Status Text: ${response.statusText || ''}
- Headers: ${JSON.stringify(response.headers || {}, null, 2)}
- Body: ${JSON.stringify(response.data || response.body || null, null, 2)}
- Response Time: ${response.responseTime || 'N/A'}ms
${existingScriptContext}

## Instructions
1. Generate test cases that validate:
   - Status code is correct
   - Response time is acceptable (if applicable)
   - Required response properties exist
   - Data types are correct
   - Values match expected patterns

2. CRITICAL: Every assertion MUST be wrapped inside a test() function call. Example:
   test("should return status 200", function() {
     expect(res.status).to.equal(200);
   });

3. Use res.status, res.body, res.responseTime, etc.
4. Write clean, readable test code with proper indentation (2 spaces)
5. Add meaningful test descriptions
${currentScript?.trim() ? '6. Add the new tests AFTER the existing script content' : ''}

Generate ONLY the JavaScript code without any explanation or markdown code blocks.`;
};

/**
 * Generate prompt for improving existing scripts
 */
const improveScriptPrompt = (currentScript, scriptType, request = {}) => {
  const scriptTypeDescription = scriptType === 'pre-request'
    ? 'This is a PRE-REQUEST script that runs BEFORE the request is sent. You have access to req (request object) and bru (Bruno utilities), but NOT res (response).'
    : 'This is a POST-RESPONSE script that runs AFTER the response is received. You have access to req, res (response object), bru, test, and expect.';

  return `You are an expert at writing JavaScript scripts for API automation in Bruno.

${BRUNO_API_REFERENCE}

${scriptTypeDescription}

## Current Script
\`\`\`javascript
${currentScript}
\`\`\`

## Request Context
- Method: ${request.method || 'N/A'}
- URL: ${request.url || 'N/A'}

## Instructions
Improve the script for:
1. Better readability and code organization
2. Proper error handling where needed
3. More efficient use of Bruno APIs
4. Clear variable naming
5. Remove any redundant code
6. Fix any potential bugs

Important:
- Keep the same functionality and intent
- Only use APIs available for ${scriptType} scripts
${scriptType === 'pre-request' ? '- Do NOT use res, test, or expect (not available in pre-request)' : ''}
- Maintain proper indentation (2 spaces)

Generate ONLY the improved JavaScript code without any explanation or markdown code blocks.`;
};

/**
 * Generate prompt for chat-based freeform interactions
 * Handles any user request related to script writing/improvement
 * @param {string} mode - The AI mode: 'ask' | 'auto-accept' | 'ask-before-edit'
 */
const chatPrompt = (userMessage, currentScript, scriptType, request = {}, response = null, mode = 'ask-before-edit', testsScript = '') => {
  let scriptTypeDescription;
  if (scriptType === 'pre-request') {
    scriptTypeDescription = 'This is a PRE-REQUEST script that runs BEFORE the request is sent. You can use req (request object) and bru (Bruno utilities), but NOT res (response), test, or expect.';
  } else if (scriptType === 'tests') {
    scriptTypeDescription = 'This is a TESTS script that runs AFTER the response is received (separate from post-response). You can use req, res (response object), bru, test, and expect. This is specifically for writing test assertions.';
  } else {
    scriptTypeDescription = 'This is a POST-RESPONSE script that runs AFTER the response is received. You can use req, res (response object), bru, test, and expect.';
  }

  // Add mode-specific instructions for Ask Mode
  const modeInstructions = mode === 'ask'
    ? `
## IMPORTANT: ASK MODE IS ACTIVE
The user is in "Ask Mode" which means they want information and explanations ONLY.
- ALWAYS respond with TEXT: prefix
- Do NOT generate code that would replace the current script (no CODE: responses)
- Provide explanations, answer questions, and give examples
- If the user asks to generate or modify code, explain what changes you would make but remind them to switch to "Ask Before Edit" or "Auto Accept" mode to apply code changes
- You can still use code blocks in markdown for illustrative examples, but these are for demonstration only
`
    : '';

  const currentScriptContext = currentScript?.trim()
    ? `\n## Current ${scriptType === 'tests' ? 'Tests' : scriptType === 'pre-request' ? 'Pre-Request' : 'Post-Response'} Script\n\`\`\`javascript\n${currentScript}\n\`\`\``
    : `\n## Current ${scriptType === 'tests' ? 'Tests' : scriptType === 'pre-request' ? 'Pre-Request' : 'Post-Response'} Script\n(No existing script)`;

  // Show tests script context if user is working on post-response but tests exist (for awareness)
  const testsScriptContext = (scriptType === 'post-response' && testsScript?.trim())
    ? `\n## Tests Script (separate tab)\n\`\`\`javascript\n${testsScript}\n\`\`\`\nNote: Tests can also be added to the Tests tab. If user explicitly says "add to tests script" or "tests tab", generate code for tests.`
    : '';

  const requestContext = request?.method
    ? `\n## Request Context\n- Method: ${request.method}\n- URL: ${request.url || 'N/A'}\n- Headers: ${JSON.stringify(request.headers || {}, null, 2)}\n- Body: ${JSON.stringify(request.body || null, null, 2)}`
    : '';

  const responseContext = response?.status
    ? `\n## Response Context\n- Status: ${response.status} ${response.statusText || ''}\n- Headers: ${JSON.stringify(response.headers || {}, null, 2)}\n- Body: ${JSON.stringify(response.data || response.body || null, null, 2)}\n- Response Time: ${response.responseTime || 'N/A'}ms`
    : '\n## Response Context\n(No response available - run the request first to get response data)';

  return `You are Bruno AI, an expert assistant for writing and improving API test scripts in Bruno (an API client like Postman).
${modeInstructions}
${BRUNO_API_REFERENCE}

${scriptTypeDescription}
${currentScriptContext}${testsScriptContext}
${requestContext}
${responseContext}

## User Request
${userMessage}

## Instructions
Analyze the user's request and respond appropriately:

**If the user is asking a QUESTION or having a conversation** (greetings like "hey", "hi", or asking about the request, response, API, explaining something, or general questions):
- Start your response with exactly "TEXT:" (no space after the colon)
- Use **Markdown formatting** to make your response clear and readable:
  - Use **bold** for emphasis on important terms
  - Use bullet points or numbered lists for multiple items
  - Use \`inline code\` for API methods, variables, and short code references (e.g., \`res.status\`, \`bru.setVar()\`)
  - Use code blocks with \`\`\`javascript for longer code examples
  - Use headers (##, ###) to organize longer explanations
- Keep responses helpful, informative, and well-structured
- Do NOT generate full replacement code for questions - use code blocks only for examples

**If the user wants to MODIFY, IMPROVE, ADD TO, or GENERATE code** (any code changes - including adding new tests, fixing, improving, refactoring, or generating new code):
- Start your response with exactly "CODE:" (no space after the colon)
- Output the COMPLETE JavaScript code that should replace the current script
- IMPORTANT: Always include ALL existing code plus your modifications/additions
- Do NOT include markdown code blocks or backticks
- Do NOT include explanations
- Use 2-space indentation
- Preserve all existing tests/code and add new code at the appropriate location
- Only use APIs available for ${scriptType} scripts
${scriptType === 'pre-request' ? '- Do NOT use res, test, or expect (not available in pre-request scripts)' : `- CRITICAL: All test assertions MUST be wrapped inside test() function calls
- IMPORTANT: Pay attention to what the user is asking:
  * "add expect IN this test" or "add more expects TO this test" = add expect() statements INSIDE the existing test() block
  * "add a new test" or "write another test" = create a new test() block
  * When adding expects to an existing test, keep them in the same test() function, do NOT create new test() blocks

  Example - adding expects INSIDE existing test:
  // Before:
  test("should return valid response", function() {
    expect(res.status).to.equal(200);
  });

  // After adding more expects IN this test:
  test("should return valid response", function() {
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id');
    expect(res.body).to.have.property('name');
  });`}

Respond now:`;
};

/**
 * Generate prompt for multi-file chat interactions
 * Handles user requests that span multiple files/requests
 * @param {string} userMessage - The user's message
 * @param {Array} files - Array of file contexts: { uid, name, method, url, preScript, postScript, testsScript, request, response }
 * @param {string} mode - The AI mode: 'ask' | 'auto-accept' | 'ask-before-edit'
 */
const multiFileChatPrompt = (userMessage, files, mode = 'ask-before-edit') => {
  // Add mode-specific instructions for Ask Mode
  const modeInstructions = mode === 'ask'
    ? `
## IMPORTANT: ASK MODE IS ACTIVE
The user is in "Ask Mode" which means they want information and explanations ONLY.
- ALWAYS respond with TEXT: prefix
- Do NOT generate code (no FILE blocks)
- Provide explanations, answer questions, and give examples
- If the user asks to generate or modify code, explain what changes you would make but remind them to switch to "Ask Before Edit" or "Auto Accept" mode to apply code changes
`
    : '';

  // Build context for each file
  const filesContext = files.map((file, index) => `
### File ${index + 1}: ${file.name}
- **UID**: ${file.uid}
- **Method**: ${file.method || 'GET'}
- **URL**: ${file.url || 'N/A'}
- **Current Pre-Request Script**: ${file.preScript?.trim() ? `\n\`\`\`javascript\n${file.preScript}\n\`\`\`` : '(none)'}
- **Current Post-Response Script**: ${file.postScript?.trim() ? `\n\`\`\`javascript\n${file.postScript}\n\`\`\`` : '(none)'}
- **Current Tests Script**: ${file.testsScript?.trim() ? `\n\`\`\`javascript\n${file.testsScript}\n\`\`\`` : '(none)'}
${file.response?.status ? `- **Last Response**: ${file.response.status} ${file.response.statusText || ''}` : '- **Response**: (not available - run the request first)'}
`).join('\n');

  return `You are Bruno AI, an expert assistant for writing and improving API test scripts in Bruno (an API client like Postman).
${modeInstructions}
${BRUNO_API_REFERENCE}

## Selected Files
The user has selected ${files.length} file(s) to work with:
${filesContext}

## User Request
${userMessage}

## Instructions
Analyze the user's request and respond appropriately:

**If the user is asking a QUESTION** (about the requests, explaining something, or general questions):
- Start your response with exactly "TEXT:" (no space after the colon)
- Use Markdown formatting for clarity
- Do NOT generate file blocks for questions

**If the user wants to MODIFY or GENERATE code for one or more files**:
For EACH file that needs changes, output using this EXACT format:

===FILE:uid-of-file===
SCRIPT_TYPE:pre-request
CODE:
// your complete script code here
===END_FILE===

OR

===FILE:uid-of-file===
SCRIPT_TYPE:post-response
CODE:
// your complete script code here
===END_FILE===

OR (for tests script tab specifically)

===FILE:uid-of-file===
SCRIPT_TYPE:tests
CODE:
// your complete tests code here
===END_FILE===

**CRITICAL RULES:**
1. Use the EXACT UID from the file list above (e.g., ${files[0]?.uid || 'abc123'})
2. SCRIPT_TYPE must be exactly "pre-request", "post-response", or "tests"
3. Only output files that need changes
4. Include the COMPLETE script code for each file (not just the additions)
5. Do NOT include markdown code fences inside the CODE section
6. If the user specifies "pre-script for file A and post-script for file B" - respect their instructions exactly
7. If user doesn't specify script type, infer from context:
   - If user explicitly mentions "tests script", "tests tab", "add to tests" → tests
   - Otherwise, tests/assertions/response validation → post-response (default for tests)
   - Auth headers, request setup, variable setting → pre-request
8. Use 2-space indentation for code
9. For post-response AND tests scripts: ALL assertions MUST be inside test() function calls

**Example output for modifying 2 files:**
===FILE:uid123===
SCRIPT_TYPE:pre-request
CODE:
// Set authentication header
req.setHeader('Authorization', 'Bearer ' + bru.getEnvVar('token'));
===END_FILE===

===FILE:uid456===
SCRIPT_TYPE:post-response
CODE:
test("should return status 200", function() {
  expect(res.status).to.equal(200);
});
===END_FILE===

Respond now:`;
};

module.exports = {
  generateTestsPrompt,
  improveScriptPrompt,
  chatPrompt,
  multiFileChatPrompt
};
