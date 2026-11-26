const { createOpenAI } = require('@ai-sdk/openai');
const {
  getModel,
  clearSdkCache
} = require('./providers');

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn()
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn()
}));

/** A callable sdk mock that also exposes .chat / .responses, like the real vercel-ai sdk. */
const makeMockSdk = () => {
  const sdk = jest.fn((modelId) => ({ via: 'default', modelId }));
  sdk.chat = jest.fn((modelId) => ({ via: 'chat', modelId }));
  sdk.responses = jest.fn((modelId) => ({ via: 'responses', modelId }));
  return sdk;
};

describe('ipc/ai/providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSdkCache();
  });

  describe('getModel — built-in providers', () => {
    const aiPreferences = {
      providers: {
        openai: { enabled: true }
      }
    };
    const getApiKey = () => 'sk-test-key';

    it('calls the sdk directly (SDK default), ignoring apiFormatOverride', () => {
      const sdk = makeMockSdk();
      createOpenAI.mockReturnValue(sdk);

      const result = getModel('gpt-4o', { aiPreferences, getApiKey, apiFormatOverride: 'responses' });

      expect(sdk).toHaveBeenCalledWith('gpt-4o');
      expect(sdk.chat).not.toHaveBeenCalled();
      expect(sdk.responses).not.toHaveBeenCalled();
      expect(result).toEqual({ via: 'default', modelId: 'gpt-4o' });
    });

    it('calls the sdk directly when no apiFormatOverride is given', () => {
      const sdk = makeMockSdk();
      createOpenAI.mockReturnValue(sdk);

      getModel('gpt-4o', { aiPreferences, getApiKey });

      expect(sdk).toHaveBeenCalledWith('gpt-4o');
      expect(sdk.chat).not.toHaveBeenCalled();
      expect(sdk.responses).not.toHaveBeenCalled();
    });

    it('throws when model is unknown', () => {
      expect(() => {
        getModel('unknown-model', { aiPreferences, getApiKey });
      }).toThrow(/Unknown model/);
    });

    it('throws when provider is not enabled', () => {
      const disabledPreferences = { providers: { openai: { enabled: false } } };

      expect(() => {
        getModel('gpt-4o', { aiPreferences: disabledPreferences, getApiKey });
      }).toThrow(/is not enabled/);
    });

    it('throws when API key is not configured', () => {
      expect(() => {
        getModel('gpt-4o', { aiPreferences, getApiKey: () => null });
      }).toThrow(/API key is not configured/);
    });
  });

  describe('getModel — custom (OpenAI-compatible) endpoints', () => {
    const compatPreferences = {
      providers: {
        'openai-compatible:local': { enabled: true }
      },
      openaiCompatibleEndpoints: [
        {
          id: 'local',
          name: 'Local',
          baseURL: 'http://localhost:1234/v1',
          models: [
            { id: 'custom-chat', modelId: 'llama3', label: 'Llama 3', apiFormat: 'chat-completions' },
            { id: 'custom-responses', modelId: 'llama3', label: 'Llama 3', apiFormat: 'responses' },
            { id: 'custom-unset', modelId: 'llama3', label: 'Llama 3' }
          ]
        }
      ]
    };
    const getApiKey = () => null;

    it('uses Chat Completions when the model apiFormat is "chat-completions"', () => {
      const sdk = makeMockSdk();
      createOpenAI.mockReturnValue(sdk);

      const result = getModel('custom-chat', { aiPreferences: compatPreferences, getApiKey });

      expect(sdk.chat).toHaveBeenCalledWith('llama3');
      expect(sdk.responses).not.toHaveBeenCalled();
      expect(sdk).not.toHaveBeenCalled();
      expect(result).toEqual({ via: 'chat', modelId: 'llama3' });
    });

    it('uses the Responses API when the model apiFormat is "responses"', () => {
      const sdk = makeMockSdk();
      createOpenAI.mockReturnValue(sdk);

      const result = getModel('custom-responses', { aiPreferences: compatPreferences, getApiKey });

      expect(sdk.responses).toHaveBeenCalledWith('llama3');
      expect(sdk.chat).not.toHaveBeenCalled();
      expect(result).toEqual({ via: 'responses', modelId: 'llama3' });
    });

    it('defaults to Chat Completions when the model has no stored apiFormat', () => {
      const sdk = makeMockSdk();
      createOpenAI.mockReturnValue(sdk);

      getModel('custom-unset', { aiPreferences: compatPreferences, getApiKey });

      expect(sdk.chat).toHaveBeenCalledWith('llama3');
      expect(sdk.responses).not.toHaveBeenCalled();
    });

    it('lets apiFormatOverride override the stored apiFormat', () => {
      const sdk = makeMockSdk();
      createOpenAI.mockReturnValue(sdk);

      getModel('custom-chat', { aiPreferences: compatPreferences, getApiKey, apiFormatOverride: 'responses' });

      expect(sdk.responses).toHaveBeenCalledWith('llama3');
      expect(sdk.chat).not.toHaveBeenCalled();
    });

    it('throws when the endpoint is missing a Base URL', () => {
      const noBaseUrlPreferences = {
        providers: { 'openai-compatible:local': { enabled: true } },
        openaiCompatibleEndpoints: [
          { id: 'local', name: 'Local', baseURL: '', models: [{ id: 'custom-chat', modelId: 'llama3' }] }
        ]
      };

      expect(() => {
        getModel('custom-chat', { aiPreferences: noBaseUrlPreferences, getApiKey });
      }).toThrow(/missing a Base URL/);
    });
  });
});
