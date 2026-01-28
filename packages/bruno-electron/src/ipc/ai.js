const { ipcMain } = require('electron');
const { streamText } = require('ai');
const { createProvider } = require('../ai/providers');
const { generateTestsPrompt, improveScriptPrompt, chatPrompt, multiFileChatPrompt } = require('../ai/prompts');

// AI Configuration - can be overridden via environment variables
const AI_CONFIG = {
  model: process.env.AI_MODEL || 'gpt-4o-mini',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS, 10) || 4000,
  temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3
};

// HTTP status code to error message mapping
const API_ERROR_MESSAGES = {
  400: 'Invalid request format. Please try again.',
  401: 'Invalid API key. Please check your OPENAI_API_KEY.',
  403: 'Access forbidden. Please check your API key permissions.',
  404: 'Model not found. Please check the model name.',
  429: 'Rate limit exceeded. Please try again later.',
  500: 'OpenAI service error. Please try again later.',
  502: 'OpenAI service temporarily unavailable. Please try again.',
  503: 'OpenAI service temporarily unavailable. Please try again.'
};

/**
 * Register AI-related IPC handlers
 * Handles AI code generation with streaming support
 */
const registerAiIpc = (mainWindow) => {
  /**
   * Main handler for AI generation requests
   * Streams the AI response back to the renderer
   */
  ipcMain.handle('ai:generate', async (event, { action, context }) => {
    // Get API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set. Please add it to your .env file in bruno-electron.');
    }

    // Create provider and get model
    const provider = createProvider('openai', apiKey);
    const modelId = AI_CONFIG.model;

    // Build prompt based on action
    let prompt;
    switch (action) {
      case 'generate-tests':
        if (!context.response) {
          throw new Error('No response data available. Please run the request first.');
        }
        prompt = generateTestsPrompt(
          context.request || {},
          context.response || {},
          context.currentScript || ''
        );
        break;

      case 'improve-script':
        if (!context.script || !context.script.trim()) {
          throw new Error('No script to improve. Please write some code first.');
        }
        prompt = improveScriptPrompt(
          context.script,
          context.scriptType || 'post-response',
          context.request || {}
        );
        break;

      case 'chat':
        prompt = chatPrompt(
          context.userMessage,
          context.script || '',
          context.scriptType || 'post-response',
          context.request || {},
          context.response || null,
          context.mode || 'ask-before-edit',
          context.testsScript || ''
        );
        break;

      case 'multi-file-chat':
        if (!context.files || context.files.length === 0) {
          throw new Error('No files selected. Please select at least one file.');
        }
        prompt = multiFileChatPrompt(
          context.userMessage,
          context.files,
          context.mode || 'ask-before-edit'
        );
        break;

      default:
        throw new Error(`Unknown AI action: ${action}`);
    }

    // Generate a unique stream ID for this request
    const streamId = `ai-stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Start streaming in the background
    (async () => {
      try {
        const { textStream } = await streamText({
          model: provider(modelId),
          prompt,
          maxTokens: AI_CONFIG.maxTokens,
          temperature: AI_CONFIG.temperature
        });

        // Accumulate full response to detect type
        let fullResponse = '';

        // Stream chunks to the renderer
        for await (const chunk of textStream) {
          fullResponse += chunk;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai:stream-chunk', { streamId, chunk });
          }
        }

        // Parse response type (TEXT: or CODE:) for chat action
        // Use case-insensitive matching as AI may return different casing
        let responseType = 'code'; // default to code for backwards compatibility
        let content = fullResponse;
        const upperResponse = fullResponse.toUpperCase();

        if (action === 'chat') {
          if (upperResponse.startsWith('TEXT:')) {
            responseType = 'text';
            content = fullResponse.slice(5).trim(); // Remove "TEXT:" prefix
          } else if (upperResponse.startsWith('CODE:')) {
            responseType = 'code';
            content = fullResponse.slice(5).trim(); // Remove "CODE:" prefix
          }
        } else if (action === 'multi-file-chat') {
          // Check if response contains multi-file format or is a text response
          if (upperResponse.startsWith('TEXT:')) {
            responseType = 'text';
            content = fullResponse.slice(5).trim();
          } else if (fullResponse.includes('===FILE:')) {
            responseType = 'multi-file';
            content = fullResponse; // Keep full content for parsing on frontend
          }
        }

        // Signal completion with response type
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ai:stream-end', { streamId, responseType, content });
        }
      } catch (error) {
        console.error('AI streaming error:', error);
        if (mainWindow && !mainWindow.isDestroyed()) {
          const errorMessage = API_ERROR_MESSAGES[error.status]
            || error.cause?.message
            || error.message
            || 'An error occurred during AI generation';
          mainWindow.webContents.send('ai:stream-error', { streamId, error: errorMessage });
        }
      }
    })();

    // Return the stream ID immediately so the renderer can start listening
    return { streamId };
  });
};

module.exports = registerAiIpc;
