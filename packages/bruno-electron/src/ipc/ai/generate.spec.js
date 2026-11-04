jest.mock('ai', () => ({
  streamText: jest.fn(() => 'ai-sdk-stream'),
  generateText: jest.fn(async () => ({ text: 'ai-sdk-text' }))
}));

jest.mock('./copilot-runtime', () => ({
  isCopilotModelRef: (model) => model?.kind === 'github-copilot-sdk',
  streamCopilotText: jest.fn(() => 'copilot-stream'),
  generateCopilotText: jest.fn(async () => ({ text: 'copilot-text' }))
}));

const { streamText, generateText } = require('ai');
const { streamCopilotText, generateCopilotText } = require('./copilot-runtime');
const { streamAiText, generateAiText } = require('./generate');

describe('ipc/ai/generate', () => {
  const copilotModel = { kind: 'github-copilot-sdk', token: 'gho_one', modelId: 'auto' };
  const sdkModel = { modelId: 'gpt-4.1', provider: 'openai.responses' };

  beforeEach(() => jest.clearAllMocks());

  it('streams Copilot models through the Copilot SDK and others through the AI SDK', () => {
    expect(streamAiText({ model: copilotModel, prompt: 'hi' })).toBe('copilot-stream');
    expect(streamCopilotText).toHaveBeenCalledWith({ model: copilotModel, prompt: 'hi' });

    expect(streamAiText({ model: sdkModel, prompt: 'hi' })).toBe('ai-sdk-stream');
    expect(streamText).toHaveBeenCalledWith({ model: sdkModel, prompt: 'hi' });
  });

  it('generates Copilot text through the Copilot SDK and others through the AI SDK', async () => {
    await expect(generateAiText({ model: copilotModel, prompt: 'hi' })).resolves.toEqual({ text: 'copilot-text' });
    expect(generateCopilotText).toHaveBeenCalled();

    await expect(generateAiText({ model: sdkModel, prompt: 'hi' })).resolves.toEqual({ text: 'ai-sdk-text' });
    expect(generateText).toHaveBeenCalled();
  });
});
