const { ipcMain } = require('electron');
const { generateText, streamText } = require('ai');
const { getPreferences } = require('../../store/preferences');
const { aiKeyStore } = require('../../store/ai-keys');
const {
  PROVIDERS,
  MODEL_DEFINITIONS,
  listProviders,
  listModels,
  getModel,
  getAvailableModels,
  clearSdkCache
} = require('./providers');
const { SCRIPT_PROMPTS, SCRIPT_TYPES, buildScriptUserPrompt, stripCodeFences } = require('./script-prompts');

const activeStreams = new Map();

const getAiPrefs = () => getPreferences().ai || {};

const isEnabled = () => Boolean(getAiPrefs().enabled);

const buildStatus = () => {
  const aiPreferences = getAiPrefs();
  const hasApiKey = (providerId) => aiKeyStore.hasKey(providerId);

  const providers = {};
  for (const provider of listProviders()) {
    providers[provider.id] = {
      ...provider,
      enabled: Boolean(aiPreferences?.providers?.[provider.id]?.enabled),
      configured: hasApiKey(provider.id)
    };
  }

  return {
    enabled: Boolean(aiPreferences.enabled),
    providers,
    models: listModels(),
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

const registerAiIpc = (mainWindow) => {
  ipcMain.handle('renderer:get-ai-status', async () => buildStatus());

  ipcMain.handle('renderer:set-ai-api-key', async (_event, { providerId, apiKey }) => {
    if (!PROVIDERS[providerId]) {
      throw new Error(`Unknown AI provider: ${providerId}`);
    }
    const trimmed = typeof apiKey === 'string' ? apiKey.trim() : '';
    if (!trimmed) {
      throw new Error('API key cannot be empty');
    }
    aiKeyStore.setKey(providerId, trimmed);
    clearSdkCache();
    return buildStatus();
  });

  ipcMain.handle('renderer:clear-ai-api-key', async (_event, { providerId }) => {
    if (!PROVIDERS[providerId]) {
      throw new Error(`Unknown AI provider: ${providerId}`);
    }
    aiKeyStore.clearKey(providerId);
    clearSdkCache();
    return buildStatus();
  });

  ipcMain.handle('renderer:get-ai-api-key', async (_event, { providerId }) => {
    if (!PROVIDERS[providerId]) {
      throw new Error(`Unknown AI provider: ${providerId}`);
    }
    return aiKeyStore.getKey(providerId) || '';
  });

  ipcMain.handle('renderer:ai-test-provider', async (_event, { providerId }) => {
    if (!PROVIDERS[providerId]) {
      return { ok: false, error: `Unknown provider: ${providerId}` };
    }
    const apiKey = aiKeyStore.getKey(providerId);
    if (!apiKey) {
      return { ok: false, error: 'No API key configured' };
    }

    const aiPrefs = getAiPrefs();
    const providerEnabled = aiPrefs?.providers?.[providerId]?.enabled;
    if (!providerEnabled) {
      return { ok: false, error: `${PROVIDERS[providerId].label} is disabled` };
    }

    const probeModel = Object.entries(MODEL_DEFINITIONS)
      .find(([, def]) => def.provider === providerId);
    if (!probeModel) {
      return { ok: false, error: `No models registered for ${providerId}` };
    }

    try {
      const model = resolveModel(probeModel[0]);
      await generateText({ model, prompt: 'ping', maxOutputTokens: 1 });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || 'Connection failed' };
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
    const { scriptType, prompt, currentScript, requestContext, model: requestedModel } = params || {};

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

    try {
      const { text } = await generateText({
        model,
        system: SCRIPT_PROMPTS[scriptType],
        prompt: buildScriptUserPrompt({ userPrompt: prompt, currentScript, requestContext }),
        maxOutputTokens: 2048
      });
      return { content: stripCodeFences(text), modelId };
    } catch (err) {
      console.error('AI generate-script error:', err);
      return { error: err.message || 'Failed to generate script' };
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
};

module.exports = registerAiIpc;
