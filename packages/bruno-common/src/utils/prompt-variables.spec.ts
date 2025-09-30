import { describe, expect, it } from '@jest/globals';

import { extractPromptVariables, extractPromptVariablesFromString } from './prompt-variables';

describe('prompt variable utils', () => {
	describe('extractPromptVariablesFromString', () => {
		it('should extract prompt variables', () => {
			expect(extractPromptVariablesFromString('Hello {{?world}}')).toEqual(['world']);
			expect(extractPromptVariablesFromString('No prompts here')).toEqual([]);
			expect(extractPromptVariablesFromString('Multiple {{?prompts}} in {{?one}} string')).toEqual(['prompts', 'one']);
		});

		it('should deduplicate prompt variables', () => {
			// Strings
			expect(extractPromptVariables('{{?world}} prompt here Hello {{?world}}')).toEqual(['world']);
			expect(extractPromptVariables('Multiple {{?prompts}} in {{?one}} string plus another {{?one}}')).toEqual(['prompts', 'one']);
		});
	});

	describe('extractPromptVariables', () => {
		it('should extract prompt variables from strings', () => {
			expect(extractPromptVariables('Hello {{?world}}')).toEqual(['world']);
			expect(extractPromptVariables('No prompts here')).toEqual([]);
			expect(extractPromptVariables('Multiple {{?prompts}} in {{?one}} string')).toEqual(['prompts', 'one']);
		});

		it('should extract prompt variables from objects', () => {
			expect(extractPromptVariables({ text: 'Hello {{?world}}' })).toEqual(['world']);
			expect(extractPromptVariables({ noPrompt: 'No prompt here' })).toEqual([]);
			expect(extractPromptVariables({ prompt1: 'Hello {{?world}}', prompt2: 'Another {{?test}}' })).toEqual(['world', 'test']);
		});

		it('should extract prompt variables from arrays', () => {
			// Strings
			expect(extractPromptVariables(['No prompts here', 'Hello {{?world}}'])).toEqual(['world']);
			expect(extractPromptVariables(['Multiple {{?prompts}} in {{?one}} string', 'Another {{?test}} string'])).toEqual(['prompts', 'one', 'test']);

			// Objects
			expect(extractPromptVariables([{ prompt: 'Hello {{?world}}', noprompt: 'No prompt here' }, { noprompt: '' }])).toEqual(['world']);

			// Nested arrays
			expect(extractPromptVariables(['Prompt {{?here}}', ['Hello {{?world}}', 'Another {{?test}} string']])).toEqual(['here', 'world', 'test']);

			// Mixed data types
			expect(extractPromptVariables([{ text: 'Multiple {{?prompts}} in {{?one}} string', noPrompt: 'No prompt here' }, ['Another {{?test}} string', { prompt: '{{?nested}}', no: 'prompt' }]])).toEqual(['prompts', 'one', 'test', 'nested']);
		});

		it('should deduplicate prompt variables', () => {
			// Strings
			expect(extractPromptVariables(['{{?world}} prompt here', 'Hello {{?world}}'])).toEqual(['world']);
			expect(extractPromptVariables(['Multiple {{?prompts}} in {{?one}} string', 'Another {{?one}} string'])).toEqual(['prompts', 'one']);
		});
	});
});
