const { streamText, generateText } = require('ai');
const { isCopilotModelRef, streamCopilotText, generateCopilotText } = require('./copilot-runtime');

const streamAiText = (args) => (isCopilotModelRef(args.model) ? streamCopilotText(args) : streamText(args));

const generateAiText = (args) => (isCopilotModelRef(args.model) ? generateCopilotText(args) : generateText(args));

module.exports = {
  streamAiText,
  generateAiText
};
