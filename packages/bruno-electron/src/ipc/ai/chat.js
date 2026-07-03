const { ipcMain } = require('electron');
const { streamText, stepCountIs } = require('ai');
const { z } = require('zod');
const { get } = require('lodash');
const { CONTENT_TYPES, TOOL_LABELS, buildSystemPrompt, resolveContentType } = require('./chat-prompts');
const {
  formatRequestContext,
  formatResponseShape,
  formatVariablesList,
  searchVariables,
  formatSearchVariablesResult
} = require('./context');
const { getPreferences } = require('../../store/preferences');

const getSecurityPrefs = () => get(getPreferences(), 'ai.security', null);

const activeStreams = new Map();

const CONTENT_LABELS = {
  'app': 'App Code',
  'tests': 'Test Code',
  'pre-request': 'Pre-Request Script',
  'post-response': 'Post-Response Script',
  'docs': 'Documentation'
};

const buildContextMessage = (contentType, allContent, requestContext, variables, security) => {
  const parts = [];
  const ctx = formatRequestContext(requestContext, { includeResponse: true, security });
  if (ctx) {
    parts.push(`HTTP Request Context:\n${ctx}`);
  }

  const varsStr = formatVariablesList(variables, { security });
  if (varsStr) {
    parts.push(`Available Variables (names only — call search_variables(query) for a value):\n${varsStr}`);
  }

  const activeLabel = CONTENT_LABELS[contentType] || 'Code';
  const activeContent = allContent[contentType] || '';
  if (activeContent.trim()) {
    parts.push(`Current ${activeLabel} (active tab — snapshot only; use read_content('${contentType}') to get the latest version before writing):\n\`\`\`\n${activeContent}\n\`\`\``);
  } else {
    parts.push(`The ${activeLabel} (active tab) is currently empty. Use read_content('${contentType}') before writing new content.`);
  }

  const others = Object.entries(allContent)
    .filter(([type, content]) => type !== contentType && content && content.trim());
  if (others.length > 0) {
    const summary = others
      .map(([type, content]) => `${CONTENT_LABELS[type] || type}:\n\`\`\`\n${content}\n\`\`\``)
      .join('\n\n');
    parts.push(`Other content in this request:\n${summary}`);
  }

  return parts.join('\n\n');
};

// Defensive fallback: if the model returns a markdown code block instead of
// calling write_content, extract the fenced code so the UI still has something
// to diff against. The tool path is the primary route.
const extractFencedCode = (text) => {
  if (!text) return null;
  const fenced = text.match(/```(?:[\w-]+)?\s*\n([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : null;
};

const READ_PARAMS = z.object({
  type: z.string().describe('Section to read. One of: \'app\', \'tests\', \'pre-request\', \'post-response\', \'docs\'.')
});
const WRITE_PARAMS = z.object({
  type: z.string().describe('Section to write. One of: \'app\', \'tests\', \'pre-request\', \'post-response\', \'docs\'.'),
  content: z.string().describe('The complete new content for the section.')
});
const READ_RESPONSE_PARAMS = z.object({});
const SEARCH_VARS_PARAMS = z.object({
  query: z
    .string()
    .optional()
    .describe('Substring to match against variable names (case-insensitive). Omit to list the first 50 variables.')
});

const registerChatIpc = ({ mainWindow, resolveModel, pickDefaultModelId, isAiEnabled }) => {
  ipcMain.on('renderer:ai-chat-stop', (_event, { requestId } = {}) => {
    const controller = activeStreams.get(requestId);
    if (controller) {
      controller.abort();
      activeStreams.delete(requestId);
    }
  });

  ipcMain.on('renderer:ai-chat-stream', async (_event, payload) => {
    const { messages, allContent, contentType, requestContext, variables, requestId, model: modelId } = payload || {};

    const send = (channel, data) => {
      if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
      }
    };

    // Validate payload shape upfront. Without this, a missing or wrong-typed
    // `messages` would throw out of the handler at `messages.map(...)` below,
    // bypassing the try/catch and never emitting `main:ai-chat-error` — the
    // renderer would then sit waiting on a stream that will never arrive.
    if (!requestId || typeof requestId !== 'string') {
      console.error('[AI] ai-chat-stream missing/invalid requestId, dropping payload');
      return;
    }
    if (!Array.isArray(messages)) {
      send('main:ai-chat-error', { requestId, error: 'Invalid request: messages must be an array' });
      return;
    }

    if (!isAiEnabled()) {
      send('main:ai-chat-error', { requestId, error: 'AI features are disabled. Enable them in Preferences > AI.' });
      return;
    }

    // Empty / 'auto' signals "let the backend pick" — resolves to the user's
    // configured default model, falling back to the first available.
    let effectiveModelId = modelId;
    if (!effectiveModelId || effectiveModelId === 'auto') {
      effectiveModelId = pickDefaultModelId();
      if (!effectiveModelId) {
        send('main:ai-chat-error', { requestId, error: 'No AI model available. Configure a provider in Preferences > AI.' });
        return;
      }
    }

    let model;
    try {
      model = resolveModel(effectiveModelId);
    } catch (err) {
      send('main:ai-chat-error', { requestId, error: err.message });
      return;
    }

    const normalizedContent = allContent || {};
    const effectiveType = contentType || 'app';
    const hasMultiple = Object.values(normalizedContent).filter((c) => c && c.trim()).length > 1;
    const security = getSecurityPrefs();

    const readState = {};
    const writeResults = [];

    const tools = {
      read_content: {
        description: 'Read the current content of a section. MUST be called before write_content for the same type.',
        inputSchema: READ_PARAMS,
        execute: async ({ type }) => {
          const resolved = resolveContentType(type, effectiveType);
          const content = normalizedContent[resolved] || '';
          readState[resolved] = content;
          return content || `(empty — no existing content for '${resolved}')`;
        }
      },
      write_content: {
        description: 'Write complete updated content to a section. MUST call read_content for the same type first. The content parameter must be the COMPLETE file content, not a diff.',
        inputSchema: WRITE_PARAMS,
        execute: async ({ type, content }) => {
          const resolved = resolveContentType(type, effectiveType);
          if (!(resolved in readState)) {
            // Tolerate models that skip read_content. We still record the
            // original snapshot so the diff renders correctly, but the UI
            // surfaces a warning when wasRead === false.
            readState[resolved] = normalizedContent[resolved] || '';
            writeResults.push({
              type: resolved,
              content,
              originalContent: readState[resolved],
              wasRead: false
            });
          } else {
            writeResults.push({
              type: resolved,
              content,
              originalContent: readState[resolved],
              wasRead: true
            });
          }
          return 'Success: Changes prepared for user review. The user will see a diff and can accept or reject your changes.';
        }
      },
      read_response: {
        description: 'Read the redacted shape of the response body from the last API request execution. Returns keys, array structure, and value types (as `<string>`, `<number>`, etc.) — actual values are stripped for user privacy. Use it to learn property paths and types when writing tests, scripts, or assertions; do not treat the placeholders as real values.',
        inputSchema: READ_RESPONSE_PARAMS,
        execute: async () => {
          const status = requestContext?.responseStatus;
          const data = requestContext?.responseData;
          if (!status && data == null) {
            return '(No response available — the request has not been executed yet. The user needs to run the request first.)';
          }
          const formatted = formatResponseShape(status, data, { security });
          return formatted || '(empty response)';
        }
      },
      search_variables: {
        description: 'Search environment / collection / global / runtime variables by name (case-insensitive substring match). Use this when the user has many variables or you need to confirm a name before referencing it in code. Values are returned, but variables marked `secret` (or whose names match patterns like `*_token`, `*_secret`, `password`, etc.) come back as `<redacted>`. Each result has a `scope` field — use it to pick the right runtime accessor: `bru.getEnvVar` for `env`, `bru.getGlobalEnvVar` for `global`, `bru.getCollectionVar` / `bru.getFolderVar` / `bru.getRequestVar` for `collection`, `bru.getVar` for `runtime`, and `bru.getSecretVar` for any value that came back redacted. Never hard-code a returned value.',
        inputSchema: SEARCH_VARS_PARAMS,
        execute: async ({ query }) => {
          if (!Array.isArray(variables) || variables.length === 0) {
            return '(No variables available — the collection has no environment, runtime, or collection variables defined.)';
          }
          const result = searchVariables(variables, query);
          return formatSearchVariablesResult(result, query, { security });
        }
      }
    };

    const allMessages = [
      { role: 'user', content: buildContextMessage(effectiveType, normalizedContent, requestContext, variables, security) },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ];

    const controller = new AbortController();
    activeStreams.set(requestId, controller);
    let fullText = '';

    const finishWithWrites = () => {
      const primary = writeResults[writeResults.length - 1];
      send('main:ai-chat-complete', {
        requestId,
        message: fullText || 'Here are the proposed changes:',
        code: primary.content,
        contentType: primary.type,
        writes: writeResults.map((w) => ({
          type: w.type,
          content: w.content,
          originalContent: w.originalContent,
          wasRead: w.wasRead
        }))
      });
    };

    try {
      const result = streamText({
        model,
        system: buildSystemPrompt(effectiveType, hasMultiple),
        messages: allMessages,
        tools,
        stopWhen: stepCountIs(5),
        toolChoice: 'auto',
        abortSignal: controller.signal
      });

      for await (const part of result.fullStream) {
        if (controller.signal.aborted) break;
        switch (part.type) {
          case 'text-delta': {
            fullText += part.text;
            send('main:ai-chat-chunk', { requestId, chunk: part.text, fullText });
            break;
          }
          case 'tool-call': {
            const input = part.input || {};
            const toolType = input.type || effectiveType;
            const label = TOOL_LABELS[part.toolName]?.[toolType]
              || TOOL_LABELS[part.toolName]?.default
              || `Running ${part.toolName}`;
            send('main:ai-chat-tool-activity', {
              requestId,
              toolName: part.toolName,
              toolArgs: input,
              label
            });
            break;
          }
          case 'tool-result': {
            send('main:ai-chat-tool-done', { requestId, toolName: part.toolName });
            break;
          }
          default:
            break;
        }
      }

      activeStreams.delete(requestId);

      if (controller.signal.aborted) {
        send('main:ai-chat-stopped', { requestId, message: fullText });
        return;
      }

      if (writeResults.length > 0) {
        finishWithWrites();
        return;
      }

      if (fullText.trim()) {
        const fallback = extractFencedCode(fullText);
        send('main:ai-chat-complete', {
          requestId,
          message: fullText,
          code: fallback,
          contentType: effectiveType
        });
        return;
      }

      send('main:ai-chat-complete', {
        requestId,
        message: 'I wasn\'t able to generate a response. Could you try rephrasing your request?',
        code: null,
        contentType: effectiveType
      });
    } catch (error) {
      activeStreams.delete(requestId);

      if (error?.name === 'AbortError' || controller.signal.aborted) {
        send('main:ai-chat-stopped', { requestId, message: fullText });
        return;
      }

      // The AI SDK may surface a stream error after the model successfully
      // emitted tool calls. Treat partial writes as the result so the user
      // doesn't lose them.
      if (writeResults.length > 0) {
        console.warn(`[AI] Stream error after successful writes (${error.message}), surfacing writes`);
        finishWithWrites();
        return;
      }

      console.error('[AI] Chat stream error:', error);
      send('main:ai-chat-error', {
        requestId,
        error: error?.message || 'Failed to get AI response'
      });
    }
  });
};

module.exports = registerChatIpc;
