const { ipcMain } = require('electron');
const { streamText, stepCountIs } = require('ai');
const { z } = require('zod');
const { CONTENT_TYPES, TOOL_LABELS, buildSystemPrompt, resolveContentType } = require('./chat-prompts');

const activeStreams = new Map();

const CONTENT_LABELS = {
  'app': 'App Code',
  'tests': 'Test Code',
  'pre-request': 'Pre-Request Script',
  'post-response': 'Post-Response Script',
  'docs': 'Documentation'
};

// Replace every primitive value with a type-name placeholder so the model
// sees the response *shape* without any real data. Customer responses can
// contain PII / secrets / tokens — we keep keys, types, and array structure
// intact so the AI can write correct property paths and assertions, but
// strip the values themselves. The AI is told these are placeholders so it
// doesn't hard-code them into generated code.
const REDACTED_TRUNCATED = '<truncated>';
const REDACTED_NULL = '<null>';
const REDACTED_BY_TYPE = {
  string: '<string>',
  number: '<number>',
  boolean: '<boolean>',
  bigint: '<bigint>'
};

const redactResponseValues = (data, depth = 0, maxDepth = 6) => {
  if (data === null) return REDACTED_NULL;
  if (data === undefined) return REDACTED_NULL;
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

const REDACTION_NOTICE
  = 'Values are placeholders (`<string>`, `<number>`, …). The shape, keys, and types are accurate but no real data is shown. Reference fields by path in generated code — do not hard-code these placeholders as literal values.';

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

const isSensitiveName = (name) => {
  if (!name) return false;
  return SENSITIVE_HEADER_PATTERNS.some((re) => re.test(name));
};

const maskValue = (name, value) => (isSensitiveName(name) ? '<redacted>' : value);

const formatRequestContext = (ctx) => {
  if (!ctx) return '';
  const parts = [];

  if (ctx.url || ctx.method) {
    parts.push(`**Request:** ${ctx.method || 'GET'} ${ctx.url || ''}`);
  }

  const headers = (ctx.headers || []).filter((h) => h.enabled);
  if (headers.length > 0) {
    parts.push(`**Headers:**\n${headers.map((h) => `  ${h.name}: ${maskValue(h.name, h.value)}`).join('\n')}`);
  }

  const params = (ctx.params || []).filter((p) => p.enabled);
  const query = params.filter((p) => p.type === 'query');
  const pathParams = params.filter((p) => p.type === 'path');
  if (query.length > 0) {
    parts.push(`**Query Parameters:**\n${query.map((p) => `  ${p.name}: ${maskValue(p.name, p.value)}`).join('\n')}`);
  }
  if (pathParams.length > 0) {
    parts.push(`**Path Parameters:**\n${pathParams.map((p) => `  ${p.name}: ${maskValue(p.name, p.value)}`).join('\n')}`);
  }

  if (ctx.body && ctx.body.mode && ctx.body.mode !== 'none') {
    let content = '';
    switch (ctx.body.mode) {
      case 'json': content = ctx.body.json || ''; break;
      case 'text': content = ctx.body.text || ''; break;
      case 'xml': content = ctx.body.xml || ''; break;
      case 'sparql': content = ctx.body.sparql || ''; break;
      case 'formUrlEncoded': {
        const items = (ctx.body.formUrlEncoded || []).filter((p) => p.enabled);
        content = items.map((p) => `  ${p.name}: ${maskValue(p.name, p.value)}`).join('\n');
        break;
      }
      case 'multipartForm': {
        const items = (ctx.body.multipartForm || []).filter((p) => p.enabled);
        content = items.map((p) => `  ${p.name}: ${p.type === 'file' ? '[file]' : maskValue(p.name, p.value)}`).join('\n');
        break;
      }
      case 'graphql':
        content = ctx.body.graphql?.query || '';
        if (ctx.body.graphql?.variables) {
          content += `\n\nVariables:\n${ctx.body.graphql.variables}`;
        }
        break;
      default:
        content = '';
    }
    if (content) {
      parts.push(`**Body (${ctx.body.mode}):**\n\`\`\`\n${content}\n\`\`\``);
    }
  }

  if (ctx.responseStatus) {
    parts.push(`**Last Response Status:** ${ctx.responseStatus}`);
  }
  if (ctx.responseData) {
    try {
      const parsed = typeof ctx.responseData === 'string' ? JSON.parse(ctx.responseData) : ctx.responseData;
      const redacted = redactResponseValues(parsed);
      if (redacted != null) {
        parts.push(`**Response Shape (values redacted — ${REDACTION_NOTICE}):**\n\`\`\`json\n${JSON.stringify(redacted, null, 2)}\n\`\`\``);
      }
    } catch {
      if (typeof ctx.responseData === 'string' && ctx.responseData.trim()) {
        parts.push(`**Response:** non-JSON, ${ctx.responseData.length} chars (call read_response() for a redacted view)`);
      }
    }
  }

  if (ctx.docs && ctx.docs.trim()) {
    parts.push(`**Documentation:**\n${ctx.docs.trim()}`);
  }

  return parts.join('\n\n');
};

const buildContextMessage = (contentType, allContent, requestContext) => {
  const parts = [];
  const ctx = formatRequestContext(requestContext);
  if (ctx) {
    parts.push(`HTTP Request Context:\n${ctx}`);
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

const registerChatIpc = ({ mainWindow, resolveModel, pickDefaultModelId, isAiEnabled }) => {
  ipcMain.on('renderer:ai-chat-stop', (_event, { requestId } = {}) => {
    const controller = activeStreams.get(requestId);
    if (controller) {
      controller.abort();
      activeStreams.delete(requestId);
    }
  });

  ipcMain.on('renderer:ai-chat-stream', async (_event, payload) => {
    const { messages, allContent, contentType, requestContext, requestId, model: modelId } = payload || {};

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
          if (!status && !data) {
            return '(No response available — the request has not been executed yet. The user needs to run the request first.)';
          }

          const parts = [];
          if (status) parts.push(`Status: ${status}`);

          if (data !== undefined && data !== null) {
            // Try to parse JSON so we can redact structurally. Non-JSON
            // payloads only get a type/length summary, we won't echo their
            // contents either, since they may contain sensitive text.
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
              parts.push(`Response Body (redacted shape):\n\`\`\`json\n${JSON.stringify(redacted, null, 2)}\n\`\`\``);
              parts.push(`Note: ${REDACTION_NOTICE}`);
            } else if (typeof data === 'string') {
              parts.push(`Response Body: non-JSON text payload, ${data.length} chars (contents withheld for user privacy)`);
            } else {
              parts.push('Response Body: opaque value (contents withheld for user privacy)');
            }
          }

          return parts.join('\n') || '(empty response)';
        }
      }
    };

    const allMessages = [
      { role: 'user', content: buildContextMessage(effectiveType, normalizedContent, requestContext) },
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
