const {
  getModel,
  resolveModelDefinition,
  clearSdkCache
} = require('./providers');

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn()
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn()
}));

describe('ipc/ai/providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSdkCache();
  });

  describe('getModel — Responses vs Chat Completions API format', () => {
    const mockGetApiKey = (providerId) => {
      if (providerId === 'openai') return 'sk-test-key';
      return null;
    };

    const aiPreferences = {
      providers: {
        openai: { enabled: true },
        anthropic: { enabled: true }
      }
    };

    it('uses Chat Completions API when format is "chat-completions"', () => {
      const mockChat = jest.fn().mockReturnValue('chat-model');
      const mockResponses = jest.fn().mockReturnValue('responses-model');

      const { createOpenAI } = require('@ai-sdk/openai');
      createOpenAI.mockReturnValue({
        chat: mockChat,
        responses: mockResponses
      });

      const result = getModel('gpt-4o', {
        aiPreferences,
        getApiKey: mockGetApiKey,
        apiFormatOverride: 'chat-completions'
      });

      expect(result).toBe('chat-model');
      expect(mockChat).toHaveBeenCalledWith('gpt-4o');
      expect(mockResponses).not.toHaveBeenCalled();
    });

    it('uses Responses API when format is "responses" and supported', () => {
      const mockChat = jest.fn().mockReturnValue('chat-model');
      const mockResponses = jest.fn().mockReturnValue('responses-model');

      const { createOpenAI } = require('@ai-sdk/openai');
      createOpenAI.mockReturnValue({
        chat: mockChat,
        responses: mockResponses
      });

      const result = getModel('gpt-4o', {
        aiPreferences,
        getApiKey: mockGetApiKey,
        apiFormatOverride: 'responses'
      });

      expect(result).toBe('responses-model');
      expect(mockResponses).toHaveBeenCalledWith('gpt-4o');
      expect(mockChat).not.toHaveBeenCalled();
    });

    it('throws when format is "responses" but SDK does not support it', () => {
      const { createOpenAI } = require('@ai-sdk/openai');
      createOpenAI.mockReturnValue({
        chat: jest.fn().mockReturnValue('chat-model')
      });

      expect(() => {
        getModel('gpt-4o', {
          aiPreferences,
          getApiKey: mockGetApiKey,
          apiFormatOverride: 'responses'
        });
      }).toThrow(/does not support the Responses API/);
    });

    it('throws when format is invalid', () => {
      const { createOpenAI } = require('@ai-sdk/openai');
      createOpenAI.mockReturnValue({
        chat: jest.fn()
      });

      expect(() => {
        getModel('gpt-4o', {
          aiPreferences,
          getApiKey: mockGetApiKey,
          apiFormatOverride: 'invalid-format'
        });
      }).toThrow(/Unsupported API format "invalid-format"/);
    });

    it('defaults to chat-completions when no format specified', () => {
      const mockChat = jest.fn().mockReturnValue('chat-model');

      const { createOpenAI } = require('@ai-sdk/openai');
      createOpenAI.mockReturnValue({
        chat: mockChat
      });

      const result = getModel('gpt-4o', {
        aiPreferences,
        getApiKey: mockGetApiKey
      });

      expect(result).toBe('chat-model');
      expect(mockChat).toHaveBeenCalledWith('gpt-4o');
    });

    it('respects apiFormatOverride over model definition format', () => {
      const mockChat = jest.fn().mockReturnValue('chat-model');
      const mockResponses = jest.fn().mockReturnValue('responses-model');

      const { createOpenAI } = require('@ai-sdk/openai');
      createOpenAI.mockReturnValue({
        chat: mockChat,
        responses: mockResponses
      });

      const result = getModel('gpt-4o', {
        aiPreferences,
        getApiKey: mockGetApiKey,
        apiFormatOverride: 'responses'
      });

      expect(result).toBe('responses-model');
      expect(mockResponses).toHaveBeenCalledWith('gpt-4o');
    });
  });

  describe('getModel — Error handling', () => {
    const mockGetApiKey = () => 'sk-test-key';
    const aiPreferences = {
      providers: {
        openai: { enabled: true }
      }
    };

    it('throws when model is unknown', () => {
      expect(() => {
        getModel('unknown-model', {
          aiPreferences,
          getApiKey: mockGetApiKey
        });
      }).toThrow(/Unknown model/);
    });

    it('throws when provider is not enabled', () => {
      const disabledPreferences = {
        providers: {
          openai: { enabled: false }
        }
      };

      expect(() => {
        getModel('gpt-4o', {
          aiPreferences: disabledPreferences,
          getApiKey: mockGetApiKey
        });
      }).toThrow(/is not enabled/);
    });

    it('throws when API key is not configured for built-in provider', () => {
      expect(() => {
        getModel('gpt-4o', {
          aiPreferences,
          getApiKey: () => null
        });
      }).toThrow(/API key is not configured/);
    });
  });
});
