const { ipcMain } = require('electron');
const { generateText, streamText, stepCountIs } = require('ai');
const { z } = require('zod');
const { getPreferences } = require('../../store/preferences');
const { aiKeyStore } = require('../../store/ai-keys');
const {
  PROVIDERS,
  listProviders,
  listModels,
  getModel,
  getAvailableModels,
  clearSdkCache,
  isKnownProviderId,
  validateApiKeyForProvider,
  providerLabel
} = require('./providers');
const {
  SCRIPT_TYPES,
  buildScriptSystemPrompt,
  buildScriptUserPrompt,
  stripCodeFences
} = require('./script-prompts');
const {
  formatResponseShape,
  searchVariables,
  formatSearchVariablesResult
} = require('./context');
const registerChatIpc = require('./chat');

const activeStreams = new Map();

const getAiPrefs = () => getPreferences().ai || {};

const isEnabled = () => Boolean(getAiPrefs().enabled);

const buildStatus = () => {
  const aiPreferences = getAiPrefs();
  const hasApiKey = (providerId) => aiKeyStore.hasKey(providerId);

  const providers = {};
  for (const provider of listProviders(aiPreferences)) {
    providers[provider.id] = {
      ...provider,
      enabled: Boolean(aiPreferences?.providers?.[provider.id]?.enabled),
      configured: hasApiKey(provider.id)
    };
  }

  return {
    enabled: Boolean(aiPreferences.enabled),
    providers,
    models: listModels(aiPreferences),
    availableModels: getAvailableModels({ aiPreferences, hasApiKey })
  };
};

const resolveModel = (modelId) => {
  if (!isEnabled()) {
    throw new Error('AI features are disabled. Enable them in Preferences > AI.');
  }
  return getModel(modelId, {
    aiPreferences: getAiPrefs(),
    getApiKey: (providerId) => aiKeyStore.getKey(providerId)
  });
};

const pickDefaultModelId = () => {
  const aiPreferences = getAiPrefs();
  const hasApiKey = (providerId) => aiKeyStore.hasKey(providerId);
  const available = getAvailableModels({ aiPreferences, hasApiKey });
  if (available.length === 0) return null;
  const preferred = aiPreferences.defaultModel;
  if (preferred && available.some((m) => m.id === preferred)) return preferred;
  return available[0].id;
};

const assertKnownProvider = (providerId) => {
  if (!isKnownProviderId(providerId, getAiPrefs())) {
    throw new Error(`Unknown AI provider: ${providerId}`);
  }
};

const registerAiIpc = (mainWindow) => {
  ipcMain.handle('renderer:get-ai-status', async () => buildStatus());

  ipcMain.handle('renderer:set-ai-api-key', async (_event, { providerId, apiKey }) => {
    assertKnownProvider(providerId);
    const trimmed = typeof apiKey === 'string' ? apiKey.trim() : '';
    if (!trimmed) {
      throw new Error('API key cannot be empty');
    }
    aiKeyStore.setKey(providerId, trimmed);
    clearSdkCache();
    return buildStatus();
  });

  ipcMain.handle('renderer:clear-ai-api-key', async (_event, { providerId }) => {
    assertKnownProvider(providerId);
    aiKeyStore.clearKey(providerId);
    clearSdkCache();
    return buildStatus();
  });

  ipcMain.handle('renderer:get-ai-api-key', async (_event, { providerId }) => {
    assertKnownProvider(providerId);
    return aiKeyStore.getKey(providerId) || '';
  });

  ipcMain.handle('renderer:ai-test-provider', async (_event, { providerId }) => {
    const aiPrefs = getAiPrefs();
    if (!isKnownProviderId(providerId, aiPrefs)) {
      return { ok: false, error: `Unknown provider: ${providerId}` };
    }
    const apiKey = aiKeyStore.getKey(providerId);
    if (!apiKey) {
      return { ok: false, error: 'No API key configured' };
    }

    const providerEnabled = aiPrefs?.providers?.[providerId]?.enabled;
    if (!providerEnabled) {
      return { ok: false, error: `${providerLabel(providerId, aiPrefs)} is disabled` };
    }

    try {
      const res = await validateApiKeyForProvider({ providerId, apiKey, aiPreferences: aiPrefs });
      if (res.ok) {
        return { ok: true };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'Invalid API key' };
      }
      if (res.status === 429) {
        return { ok: false, error: 'Rate limited — try again in a moment' };
      }
      return { ok: false, error: `Could not verify key (HTTP ${res.status})` };
    } catch (err) {
      return { ok: false, error: err.message || 'Could not reach provider. Check your network connection.' };
    }
  });

  ipcMain.handle('renderer:ai-generate-text', async (_event, params) => {
    const { model: modelId, system, prompt, maxTokens, temperature } = params || {};
    if (!modelId || !prompt) {
      return { error: 'model and prompt are required' };
    }

    try {
      const model = resolveModel(modelId);
      const { text } = await generateText({
        model,
        system,
        prompt,
        maxOutputTokens: maxTokens ?? 1024,
        temperature: temperature ?? 0.3
      });
      return { text };
    } catch (err) {
      console.error('AI generate-text error:', err);
      return { error: err.message || 'Failed to generate text' };
    }
  });

  ipcMain.handle('renderer:ai-generate-script', async (_event, params) => {
    const {
      scriptType,
      prompt,
      currentScript,
      requestContext,
      docsContext,
      variables,
      model: requestedModel,
      streamId
    } = params || {};

    if (!SCRIPT_TYPES.includes(scriptType)) {
      return { error: `Unknown scriptType: ${scriptType}` };
    }
    if (!prompt || !prompt.trim()) {
      return { error: 'Prompt is required' };
    }

    const modelId = requestedModel || pickDefaultModelId();
    if (!modelId) {
      return { error: 'No AI model available. Configure a provider in Preferences > AI.' };
    }

    let model;
    try {
      model = resolveModel(modelId);
    } catch (err) {
      return { error: err.message };
    }

    const controller = streamId ? new AbortController() : null;
    if (streamId && controller) {
      activeStreams.set(streamId, controller);
    }

    // Generation runs through streamText so the model can call tools
    // (read_response, search_variables) when the inline context isn't enough.
    // We don't stream tokens back to the renderer — the sparkle UI shows a
    // spinner and applies the final code as a single blob — but the
    // step-based loop gives the model a chance to gather context first.
    const tools = {
      read_response: {
        description: 'Returns the redacted shape (keys + value types) of the last response for this request. Use it before writing tests/post-response code to learn property paths and types. Real values are stripped — reference fields at runtime, don\'t hard-code the placeholder strings.',
        inputSchema: z.object({}),
        execute: async () => {
          const status = requestContext?.responseStatus;
          const data = requestContext?.responseData;
          if (!status && data == null) {
            return '(No response available — the request has not been executed yet.)';
          }
          return formatResponseShape(status, data) || '(empty response)';
        }
      },
      search_variables: {
        description: 'Search environment / collection / global / runtime variables by name (case-insensitive substring). Pass a query to confirm a name before referencing it. Secret variables come back as `<redacted>`. Each result has a `scope` field — use it to pick the right runtime accessor: `bru.getEnvVar` for `env`, `bru.getGlobalEnvVar` for `global`, `bru.getCollectionVar` / `bru.getFolderVar` / `bru.getRequestVar` for `collection`, `bru.getVar` for `runtime`, and `bru.getSecretVar` for any value that came back redacted. Never hard-code a returned value.',
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe('Substring to match against variable names. Omit to list the first 50.')
        }),
        execute: async ({ query }) => {
          if (!Array.isArray(variables) || variables.length === 0) {
            return '(No variables available — the collection has no environment, runtime, or collection variables defined.)';
          }
          const result = searchVariables(variables, query);
          return formatSearchVariablesResult(result, query);
        }
      }
    };

    try {
      const result = streamText({
        model,
        system: buildScriptSystemPrompt(scriptType),
        prompt: buildScriptUserPrompt({
          userPrompt: prompt,
          currentScript,
          requestContext,
          docsContext,
          variables,
          scriptType
        }),
        tools,
        // Cap tool-call iteration — the model gets a few chances to look
        // things up before it MUST produce the final script.
        stopWhen: stepCountIs(4),
        toolChoice: 'auto',
        maxOutputTokens: 2048,
        abortSignal: controller?.signal
      });

      let fullText = '';
      for await (const part of result.fullStream) {
        if (controller?.signal.aborted) break;
        if (part.type === 'text-delta') {
          fullText += part.text;
        }
      }

      if (controller?.signal.aborted) {
        return { stopped: true };
      }

      const content = stripCodeFences(fullText);
      if (!content || !content.trim()) {
        return { error: 'No content was generated. Try rephrasing your prompt.' };
      }
      return { content, modelId };
    } catch (err) {
      if (err?.name === 'AbortError' || controller?.signal.aborted) {
        return { stopped: true };
      }
      console.error('AI generate-script error:', err);
      return { error: err.message || 'Failed to generate script' };
    } finally {
      if (streamId) activeStreams.delete(streamId);
    }
  });

  ipcMain.on('renderer:ai-stream-text', async (_event, params) => {
    const { streamId, model: modelId, system, messages, prompt, maxTokens, temperature } = params || {};
    if (!streamId) return;

    const send = (channel, payload) => {
      if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
      }
    };

    if (activeStreams.has(streamId)) {
      send('main:ai-stream-error', { streamId, error: 'streamId is already active' });
      return;
    }

    if (!modelId || (!messages && !prompt)) {
      send('main:ai-stream-error', { streamId, error: 'model and messages/prompt are required' });
      return;
    }

    let model;
    try {
      model = resolveModel(modelId);
    } catch (err) {
      send('main:ai-stream-error', { streamId, error: err.message });
      return;
    }

    const controller = new AbortController();
    activeStreams.set(streamId, controller);

    let fullText = '';
    try {
      const streamArgs = {
        model,
        system,
        maxOutputTokens: maxTokens ?? 2048,
        temperature: temperature ?? 0.7,
        abortSignal: controller.signal
      };
      if (messages) {
        streamArgs.messages = messages;
      } else {
        streamArgs.prompt = prompt;
      }
      const result = streamText(streamArgs);

      for await (const part of result.fullStream) {
        if (controller.signal.aborted) break;
        if (part.type === 'text-delta') {
          fullText += part.text;
          send('main:ai-stream-chunk', { streamId, chunk: part.text, fullText });
        }
      }

      if (controller.signal.aborted) {
        send('main:ai-stream-stopped', { streamId, fullText });
      } else {
        send('main:ai-stream-complete', { streamId, fullText });
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        send('main:ai-stream-stopped', { streamId, fullText });
      } else {
        console.error('AI stream-text error:', err);
        send('main:ai-stream-error', { streamId, error: err.message || 'Failed to stream' });
      }
    } finally {
      activeStreams.delete(streamId);
    }
  });

  ipcMain.on('renderer:ai-stop-stream', (_event, { streamId } = {}) => {
    const controller = activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      activeStreams.delete(streamId);
    }
  });

  registerChatIpc({
    mainWindow,
    resolveModel,
    pickDefaultModelId,
    isAiEnabled: isEnabled
  });
};

module.exports = registerAiIpc;
