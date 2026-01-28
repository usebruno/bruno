const { createOpenAI } = require('@ai-sdk/openai');

/**
 * Registry of supported AI providers
 * Each provider factory takes an apiKey and returns a configured provider instance
 */
const providerRegistry = {
  openai: (apiKey) => createOpenAI({ apiKey })
};

/**
 * Get list of supported provider names
 */
const getSupportedProviders = () => Object.keys(providerRegistry);

/**
 * Creates an AI SDK provider instance
 * @param {string} providerName - Name of the provider (e.g., 'openai')
 * @param {string} apiKey - API key for the provider
 * @returns {object} Configured provider instance
 * @throws {Error} If provider is unknown or apiKey is missing
 */
const createProvider = (providerName, apiKey) => {
  // Validate provider name
  const factory = providerRegistry[providerName];
  if (!factory) {
    const supported = getSupportedProviders().join(', ');
    throw new Error(`Unknown AI provider: "${providerName}". Supported providers: ${supported}`);
  }

  // Validate API key
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error(`API key is required for provider "${providerName}"`);
  }

  return factory(apiKey.trim());
};

module.exports = { createProvider, getSupportedProviders };
