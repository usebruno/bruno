const { createOpenAI } = require('@ai-sdk/openai');
const { createAnthropic } = require('@ai-sdk/anthropic');

const PROVIDERS = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    apiKeyPlaceholder: 'sk-...',
    apiKeyHelpUrl: 'https://platform.openai.com/api-keys',
    createSdk: ({ apiKey }) => createOpenAI({ apiKey })
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyHelpUrl: 'https://console.anthropic.com/settings/keys',
    createSdk: ({ apiKey }) => createAnthropic({ apiKey })
  }
};

/**
 * Model catalog. Each entry is keyed by a stable id used in preferences and IPC.
 * `modelId` is the value passed to the provider SDK; `id` is the Bruno-internal id.
 */
const MODEL_DEFINITIONS = {
  // OpenAI
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o', label: 'GPT-4o' },
  'gpt-5': { provider: 'openai', modelId: 'gpt-5', label: 'GPT-5' },
  'gpt-5-mini': { provider: 'openai', modelId: 'gpt-5-mini', label: 'GPT-5 Mini' },
  // Anthropic
  'claude-opus-4-7': { provider: 'anthropic', modelId: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  'claude-sonnet-4-6': { provider: 'anthropic', modelId: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  'claude-haiku-4-5': { provider: 'anthropic', modelId: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' }
};

// Cache SDK instances. Keyed by `${providerId}:${apiKey}` so changing keys rebuilds the SDK.
const sdkCache = new Map();

const getSdk = (providerId, apiKey) => {
  const cacheKey = `${providerId}:${apiKey}`;
  let sdk = sdkCache.get(cacheKey);
  if (!sdk) {
    const provider = PROVIDERS[providerId];
    if (!provider) throw new Error(`Unknown AI provider: ${providerId}`);
    sdk = provider.createSdk({ apiKey });
    sdkCache.set(cacheKey, sdk);
  }
  return sdk;
};

const clearSdkCache = () => {
  sdkCache.clear();
};

const listProviders = () => Object.values(PROVIDERS).map((p) => ({
  id: p.id,
  label: p.label,
  apiKeyPlaceholder: p.apiKeyPlaceholder,
  apiKeyHelpUrl: p.apiKeyHelpUrl
}));

const listModels = () => Object.entries(MODEL_DEFINITIONS).map(([id, def]) => ({
  id,
  label: def.label,
  provider: def.provider
}));

/**
 * Resolve a Bruno model id to a vercel-ai SDK model instance.
 * Throws if the provider isn't configured (no key) or the model is unknown.
 */
const getModel = (modelId, { aiPreferences, getApiKey }) => {
  const def = MODEL_DEFINITIONS[modelId];
  if (!def) throw new Error(`Unknown model: ${modelId}`);

  const providerConfig = aiPreferences?.providers?.[def.provider];
  if (!providerConfig?.enabled) {
    throw new Error(`${PROVIDERS[def.provider].label} is not enabled. Enable it in Preferences > AI.`);
  }

  const apiKey = getApiKey(def.provider);
  if (!apiKey) {
    throw new Error(`${PROVIDERS[def.provider].label} API key is not configured. Add it in Preferences > AI.`);
  }

  return getSdk(def.provider, apiKey)(def.modelId);
};

/**
 * List models that are usable right now (provider enabled + key configured + model not disabled).
 */
const getAvailableModels = ({ aiPreferences, hasApiKey }) => {
  const out = [];
  for (const [id, def] of Object.entries(MODEL_DEFINITIONS)) {
    const providerConfig = aiPreferences?.providers?.[def.provider];
    if (!providerConfig?.enabled) continue;
    if (!hasApiKey(def.provider)) continue;

    const modelConfig = aiPreferences?.models?.[id];
    if (modelConfig?.enabled === false) continue;

    out.push({ id, label: def.label, provider: def.provider });
  }
  return out;
};

module.exports = {
  PROVIDERS,
  MODEL_DEFINITIONS,
  listProviders,
  listModels,
  getModel,
  getAvailableModels,
  clearSdkCache
};
