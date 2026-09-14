const { ipcMain } = require('electron');
const { generateText } = require('ai');
const { getPreferences } = require('../../store/preferences');
const { aiKeyStore } = require('../../store/ai-keys');
const { getModel, getAvailableModels, isReasoningModel, isOpenAiReasoningModel } = require('./providers');
const { buildSystemPrompt, buildUserPrompt, STOP_SEQUENCES, sanitizeSuggestion } = require('./autocomplete-prompts');

const SUPPORTED_SCRIPT_TYPES = ['tests', 'pre-request', 'post-response'];

// Models that punch above their weight on completion latency/cost. Used to
// auto-pick a sensible default when the user hasn't chosen one explicitly.
const FAST_MODEL_PREFERENCE = [
  'gpt-4o-mini',
  'gpt-5-mini',
  'claude-haiku-4-5'
];

// In-process LRU + TTL cache for completions. Keyed on (model, scriptType,
// recent-prefix, near-suffix). Bounded so unbounded typing doesn't grow it.
const CACHE_MAX_ENTRIES = 100;
const CACHE_TTL_MS = 5 * 60 * 1000;
const suggestionCache = new Map();

const cacheKey = ({ modelId, scriptType, prefix, suffix, security }) => {
  // Trim to the bytes that matter for completion — recent prefix, near suffix.
  const p = prefix.slice(-400);
  const s = suffix.slice(0, 200);
  // Fold the security config into the key so toggling redaction doesn't
  // return a stale suggestion built from a differently-redacted context.
  const sec = security ? JSON.stringify(security) : '';
  // JSON-encode the fields as an array so their boundaries are unambiguous —
  // no content can forge a separator and collide with a different key.
  return JSON.stringify([modelId, scriptType, p, s, sec]);
};

const cacheGet = (key) => {
  const entry = suggestionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    suggestionCache.delete(key);
    return null;
  }
  // Refresh LRU position by deleting and re-inserting.
  suggestionCache.delete(key);
  suggestionCache.set(key, entry);
  return entry.value;
};

const cacheSet = (key, value) => {
  if (suggestionCache.has(key)) suggestionCache.delete(key);
  suggestionCache.set(key, { at: Date.now(), value });
  while (suggestionCache.size > CACHE_MAX_ENTRIES) {
    const oldest = suggestionCache.keys().next().value;
    suggestionCache.delete(oldest);
  }
};

const getAiPrefs = () => getPreferences().ai || {};
const getAutocompletePrefs = () => getAiPrefs().autocomplete || {};

const isAutocompleteEnabled = () => {
  const ai = getAiPrefs();
  const ac = ai.autocomplete || {};
  // master AI switch must be on; autocomplete is opt-in but defaults to true.
  return Boolean(ai.enabled) && ac.enabled !== false;
};

const hasApiKey = (providerId) => aiKeyStore.hasKey(providerId);

const pickAutocompleteModelId = () => {
  const ai = getAiPrefs();
  const available = getAvailableModels({ aiPreferences: ai, hasApiKey });
  if (available.length === 0) return null;

  const preferred = getAutocompletePrefs().model;
  if (preferred && available.some((m) => m.id === preferred)) return preferred;

  // Auto-pick a fast model when possible — autocomplete is latency-critical.
  for (const id of FAST_MODEL_PREFERENCE) {
    if (available.some((m) => m.id === id)) return id;
  }

  // Else fall back to the global defaultModel if it's usable, then first available.
  const defaultModel = ai.defaultModel;
  if (defaultModel && available.some((m) => m.id === defaultModel)) return defaultModel;
  return available[0].id;
};

const resolveModel = (modelId) => getModel(modelId, {
  aiPreferences: getAiPrefs(),
  getApiKey: (providerId) => aiKeyStore.getKey(providerId)
});

// Active per-request AbortControllers, keyed by client-supplied requestId.
// Used so a fresh keystroke can cancel an in-flight request and save tokens.
const activeRequests = new Map();

const registerAutocompleteIpc = () => {
  ipcMain.handle('renderer:ai-autocomplete', async (_event, params) => {
    const {
      requestId,
      scriptType,
      prefix = '',
      suffix = '',
      requestContext = null,
      variableNames = null,
      siblingScripts = null
    } = params || {};

    if (!SUPPORTED_SCRIPT_TYPES.includes(scriptType)) {
      return { error: `Unsupported scriptType: ${scriptType}` };
    }

    if (!isAutocompleteEnabled()) {
      return { disabled: true };
    }

    if (!prefix || prefix.length < 3) {
      // Too little context to produce a useful suggestion; skip silently.
      return { suggestion: '' };
    }

    const modelId = pickAutocompleteModelId();
    if (!modelId) {
      return { error: 'No AI model available. Configure a provider in Preferences > AI.' };
    }

    const security = getAiPrefs().security || null;
    const key = cacheKey({ modelId, scriptType, prefix, suffix, security });
    const cached = cacheGet(key);
    if (cached !== null) {
      return { suggestion: cached, fromCache: true, modelId };
    }

    let model;
    try {
      model = resolveModel(modelId);
    } catch (err) {
      return { error: err.message };
    }

    const controller = new AbortController();
    if (requestId) {
      // If somehow the same id is reused, abort the prior one.
      activeRequests.get(requestId)?.abort();
      activeRequests.set(requestId, controller);
    }

    const reasoning = isReasoningModel(modelId);
    const openAiReasoning = isOpenAiReasoningModel(modelId);

    try {
      const { text } = await generateText({
        model,
        system: buildSystemPrompt(scriptType),
        prompt: buildUserPrompt({ prefix, suffix, scriptType, requestContext, variableNames, siblingScripts, security }),
        maxOutputTokens: openAiReasoning ? 1500 : 200,
        ...(reasoning ? {} : { temperature: 0.2, stopSequences: STOP_SEQUENCES }),
        ...(openAiReasoning
          ? { providerOptions: { openai: { reasoningEffort: 'minimal', textVerbosity: 'low' } } }
          : {}),
        abortSignal: controller.signal
      });

      const suggestion = sanitizeSuggestion({ text, prefix, scriptType });
      if (suggestion) cacheSet(key, suggestion);
      return { suggestion, modelId };
    } catch (err) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return { cancelled: true };
      }
      // Don't spam the console on every transient failure — autocomplete fires often.
      return { error: err.message || 'Autocomplete request failed' };
    } finally {
      if (requestId && activeRequests.get(requestId) === controller) {
        activeRequests.delete(requestId);
      }
    }
  });

  ipcMain.on('renderer:ai-autocomplete-cancel', (_event, { requestId } = {}) => {
    if (!requestId) return;
    const controller = activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      activeRequests.delete(requestId);
    }
  });
};

module.exports = registerAutocompleteIpc;
