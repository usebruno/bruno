const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const { generateText } = require('ai');
const { createOpenAI } = require('@ai-sdk/openai');
const { preferencesUtil } = require('../store/preferences');

// Check if AI is configured via preferences
const isAIConfigured = () => {
  return preferencesUtil.isAIEnabled() && !!preferencesUtil.getAIApiKey();
};

// Cache for suggestions to improve performance
const suggestionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Load prompt templates (cached - restart app to reload)
let systemPromptTemplate = null;
let userPromptTemplate = null;

const loadSystemPrompt = () => {
  if (systemPromptTemplate) return systemPromptTemplate;

  try {
    const promptPath = path.join(__dirname, '../ai-context/system-prompt.md');
    systemPromptTemplate = fs.readFileSync(promptPath, 'utf-8');
    return systemPromptTemplate;
  } catch (error) {
    console.error('Failed to load system prompt:', error);
    return null;
  }
};

const loadUserPromptTemplate = () => {
  if (userPromptTemplate) return userPromptTemplate;

  try {
    const promptPath = path.join(__dirname, '../ai-context/code-completion-prompt.md');
    userPromptTemplate = fs.readFileSync(promptPath, 'utf-8');
    return userPromptTemplate;
  } catch (error) {
    console.error('Failed to load user prompt template:', error);
    return null;
  }
};

// Create OpenAI provider using API key from preferences
const createProvider = () => {
  const apiKey = preferencesUtil.getAIApiKey();
  return createOpenAI({
    apiKey
  });
};

// Get model ID from environment or use default
// gpt-4.1-mini is a good balance of speed and coding quality
const getModelId = () => {
  return process.env.OPENAI_MODEL || 'gpt-4o';
};

// Generate cache key from input
const getCacheKey = (code, cursorPosition, scriptType) => {
  return `${scriptType}:${code.substring(0, cursorPosition)}`;
};

// Clean old cache entries
const cleanCache = () => {
  const now = Date.now();
  for (const [key, entry] of suggestionCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      suggestionCache.delete(key);
    }
  }

  // If still too large, remove oldest entries
  if (suggestionCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(suggestionCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => suggestionCache.delete(key));
  }
};

// Extract existing test names from code
const extractExistingTests = (code) => {
  const testRegex = /test\s*\(\s*["']([^"']+)["']/g;
  const tests = [];
  let match;
  while ((match = testRegex.exec(code)) !== null) {
    tests.push(match[1]);
  }
  return tests;
};

// Extract what's being tested (status, body, headers, etc.)
const extractTestedAspects = (code) => {
  const aspects = [];
  if (/res\.getStatus\(\)/.test(code)) aspects.push('status code');
  if (/res\.getBody\(\)/.test(code)) aspects.push('response body');
  if (/res\.getHeader\(/.test(code)) aspects.push('headers');
  if (/res\.getResponseTime\(\)/.test(code)) aspects.push('response time');
  if (/bru\.getEnvVar\(/.test(code)) aspects.push('environment variables');
  if (/bru\.getVar\(/.test(code)) aspects.push('collection variables');
  return aspects;
};

// Check if cursor is inside a test block by counting braces
const checkIfInsideTestBlock = (codeBeforeCursor) => {
  // Find all test block openings - handle both quote types and allow quotes inside the string
  // Match: test("...", function() {  OR  test('...', function() {
  const testBlockRegex = /test\s*\(\s*(?:"[^"]*"|'[^']*')\s*,\s*function\s*\(\s*\)\s*\{/g;
  let match;
  let lastTestBlockStart = -1;

  while ((match = testBlockRegex.exec(codeBeforeCursor)) !== null) {
    lastTestBlockStart = match.index + match[0].length;
  }

  // If no test block found, we're not inside one
  if (lastTestBlockStart === -1) return false;

  // Count braces from the last test block opening to cursor
  const codeAfterTestStart = codeBeforeCursor.substring(lastTestBlockStart);
  let braceCount = 1; // Start with 1 because test block opened with {

  for (const char of codeAfterTestStart) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    // If braceCount reaches 0, the test block is closed
    if (braceCount === 0) return false;
  }

  // If braceCount > 0, we're still inside the test block
  return braceCount > 0;
};

// Check if cursor is inside a regular function (not test)
const checkIfInsideRegularFunction = (codeBeforeCursor) => {
  // Match: function name() { OR function() { OR const name = function() { OR => {
  const functionRegex = /(?:function\s*\w*\s*\([^)]*\)\s*\{|=>\s*\{|\w+\s*\([^)]*\)\s*\{)/g;
  let match;
  let lastFunctionStart = -1;

  while ((match = functionRegex.exec(codeBeforeCursor)) !== null) {
    // Skip if this is a test block
    const beforeMatch = codeBeforeCursor.substring(0, match.index);
    if (beforeMatch.match(/test\s*\(\s*(?:"[^"]*"|'[^']*')\s*,\s*$/)) {
      continue; // This is a test callback, skip
    }
    lastFunctionStart = match.index + match[0].length;
  }

  if (lastFunctionStart === -1) return false;

  // Count braces from the last function opening to cursor
  const codeAfterFunctionStart = codeBeforeCursor.substring(lastFunctionStart);
  let braceCount = 1;

  for (const char of codeAfterFunctionStart) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount === 0) return false;
  }

  return braceCount > 0;
};

// Extract task instructions from the system prompt
const getTaskInstructions = (promptType) => {
  const systemPrompt = loadSystemPrompt();
  if (!systemPrompt) return 'Complete the current line of code.';

  // Look for [TASK:promptType] section in the system prompt
  const taskRegex = new RegExp(`### \\[TASK:${promptType}\\]\\n([\\s\\S]*?)(?=### \\[TASK:|$)`, 'i');
  const match = systemPrompt.match(taskRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallback to general
  const generalMatch = systemPrompt.match(/### \[TASK:general\]\n([\s\S]*?)(?=### \[TASK:|$)/i);
  return generalMatch ? generalMatch[1].trim() : 'Complete the current line of code.';
};

// Detect the prompt type based on code context
const detectPromptType = (codeBeforeCursor, scriptType) => {
  const isInsideTestBlock = checkIfInsideTestBlock(codeBeforeCursor);
  const isInsideFunction = checkIfInsideRegularFunction(codeBeforeCursor);
  const lines = codeBeforeCursor.split('\n');
  const lastLine = lines[lines.length - 1] || '';
  const trimmedLastLine = lastLine.trim();

  // Check previous line for context (comments suggesting what to generate)
  const prevLine = lines.length > 1 ? lines[lines.length - 2]?.trim() || '' : '';

  // Keywords that suggest user wants general code, not tests
  const codeKeywords = /\b(function|const|let|var|if|else|for|while|loop|map|filter|reduce|async|await|fetch|parse|extract|transform|process)\b/i;
  const testKeywords = /\b(test|assert|check|verify|expect|should|must)\b/i;

  // Check if user is in the middle of typing something
  const isTypingCode = trimmedLastLine.length > 0
    && !trimmedLastLine.startsWith('//')
    && !trimmedLastLine.startsWith('test(')
    && !trimmedLastLine.endsWith(';')
    && !trimmedLastLine.endsWith('{')
    && !trimmedLastLine.endsWith('}');

  // Inside a regular function (not test) - generate normal code, NO expect()
  if (isInsideFunction && !isInsideTestBlock) {
    return isTypingCode ? 'complete-line' : 'inside-function';
  }

  // Pre-request script - never suggest tests
  if (scriptType === 'pre-request') {
    return isTypingCode ? 'complete-line' : 'pre-request';
  }

  // Post-response script - never suggest tests
  if (scriptType === 'post-response') {
    return isTypingCode ? 'complete-line' : 'post-response';
  }

  // Tests script - can suggest test blocks OR general code
  if (scriptType === 'tests') {
    if (isInsideTestBlock) {
      return isTypingCode ? 'complete-line' : 'inside-test';
    }

    if (isTypingCode) return 'complete-line';

    // Check if comment/context suggests general code vs test
    const contextLine = prevLine.startsWith('//') ? prevLine : trimmedLastLine;
    if (codeKeywords.test(contextLine) && !testKeywords.test(contextLine)) {
      return 'general';
    }

    // Default to new-test at top level in tests script
    if (trimmedLastLine === ''
      || trimmedLastLine.startsWith('//')
      || trimmedLastLine.endsWith(';')
      || trimmedLastLine.endsWith('}')) {
      return 'new-test';
    }
    return 'complete-line';
  }

  return isTypingCode ? 'complete-line' : 'general';
};

// Build the user prompt (dynamic content only)
const buildUserPrompt = (code, cursorPosition, scriptType, requestContext) => {
  let template = loadUserPromptTemplate();

  if (!template) {
    console.error('[AI-Suggestions] Failed to load user prompt template');
    return null;
  }

  const codeBeforeCursor = code.substring(0, cursorPosition);
  const codeAfterCursor = code.substring(cursorPosition);

  // Detect prompt type
  const promptType = detectPromptType(codeBeforeCursor, scriptType);

  // Extract existing tests info
  const existingTests = extractExistingTests(code);
  const testedAspects = extractTestedAspects(code);

  let existingTestsInfo = '';
  if (existingTests.length > 0) {
    existingTestsInfo = `### Existing Tests (DO NOT DUPLICATE)\n${existingTests.map((t) => `- "${t}"`).join('\n')}\n\n### Already Tested\n${testedAspects.length > 0 ? testedAspects.join(', ') : 'none'}`;
  }

  // Build request context
  const requestContextStr = requestContext
    ? `URL: ${requestContext.url || 'unknown'}\nMethod: ${requestContext.method || 'GET'}`
    : 'No request context available';

  // Get task instructions from system prompt
  const taskInstructions = getTaskInstructions(promptType);

  // Replace all placeholders in template
  template = template
    .replace('{{PROMPT_TYPE}}', promptType)
    .replace('{{TASK_INSTRUCTIONS}}', taskInstructions)
    .replace('{{EXISTING_TESTS_INFO}}', existingTestsInfo)
    .replace('{{REQUEST_CONTEXT}}', requestContextStr)
    .replace('{{CODE_BEFORE_CURSOR}}', codeBeforeCursor)
    .replace('{{CODE_AFTER_CURSOR}}', codeAfterCursor);

  return template;
};

// Generate suggestion using AI
const generateSuggestion = async (code, cursorPosition, scriptType, requestContext) => {
  const cacheKey = getCacheKey(code, cursorPosition, scriptType);

  // Check cache first
  const cached = suggestionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { suggestion: cached.suggestion, fromCache: true };
  }

  const provider = createProvider();
  const modelId = getModelId();

  const systemPrompt = loadSystemPrompt();
  const userPrompt = buildUserPrompt(code, cursorPosition, scriptType, requestContext);

  if (!systemPrompt || !userPrompt) {
    throw new Error('Failed to build prompts - templates not loaded');
  }

  try {
    const { text } = await generateText({
      model: provider(modelId),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 150,
      temperature: 0.2,
      stopSequences: ['```', '});c', '});l', '});v', '});b', '});/', '});\n', '\n\ntest(']
    });

    // Clean up the suggestion
    let suggestion = text.trim();
    suggestion = suggestion.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    suggestion = suggestion.replace(/^\n+/, '');

    // If suggestion contains a test block, trim everything after the closing });
    if (suggestion.includes('test(') && suggestion.includes('function()')) {
      const testEndMatch = suggestion.match(/\}\);/);
      if (testEndMatch) {
        const endIndex = suggestion.indexOf('});') + 3;
        suggestion = suggestion.substring(0, endIndex);
      }
    }

    // Cache the result
    suggestionCache.set(cacheKey, {
      suggestion,
      timestamp: Date.now()
    });

    // Clean cache periodically
    if (Math.random() < 0.1) cleanCache();

    return { suggestion, fromCache: false };
  } catch (error) {
    throw error;
  }
};

// Register IPC handlers
const registerAISuggestionsIpc = (_mainWindow) => {
  // Get AI suggestion
  ipcMain.handle('renderer:get-ai-suggestion', async (_event, params) => {
    const { code, cursorPosition, scriptType, requestContext } = params;

    // Check if AI is enabled and API key is configured in preferences
    if (!isAIConfigured()) {
      return { error: 'AI not configured. Please enable AI and add your API key in Preferences > AI.' };
    }

    try {
      const result = await generateSuggestion(
        code,
        cursorPosition,
        scriptType,
        requestContext
      );

      return result;
    } catch (error) {
      return { error: error.message };
    }
  });
};

module.exports = registerAISuggestionsIpc;
