/**
 * AI Suggestions API for Bruno
 * Uses OpenAI via Vercel AI SDK through IPC
 * API key is configured in Preferences > AI
 */

import { callIpc } from '../common/ipc';

/**
 * Get AI suggestion for code completion
 * @param {Object} params - Parameters for suggestion
 * @param {string} params.code - Current code content
 * @param {number} params.cursorPosition - Cursor position in code
 * @param {string} params.scriptType - Type of script (tests, pre-request, post-response)
 * @param {Object} params.requestContext - Context about the current request
 * @returns {Promise<{suggestion: string, fromCache: boolean} | {error: string}>}
 */
export const getAISuggestion = async ({ code, cursorPosition, scriptType, requestContext }) => {
  try {
    const result = await callIpc('renderer:get-ai-suggestion', {
      code,
      cursorPosition,
      scriptType,
      requestContext
    });

    return result;
  } catch (error) {
    return { error: error.message || 'Failed to get AI suggestion' };
  }
};
