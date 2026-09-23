import { describe, expect, it } from '@jest/globals';

import { extractPromptVariables, extractPromptVariablesFromString, parsePromptVariable } from './prompt-variables';

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

    it('should not extract prompt variables from invalid template patterns', () => {
      expect(extractPromptVariables('Prompt with valid {{?inner space}}')).toEqual(['inner space']);
      expect(extractPromptVariables('Prompt with invalid {{? leading space}}')).toEqual([]);
      expect(extractPromptVariables('Prompt with invalid {{?trailing space }}')).toEqual([]);
      expect(extractPromptVariables('Prompt with invalid {{?{curly brace}}')).toEqual([]);
      expect(extractPromptVariables('Prompt with invalid {{?}curly brace}}')).toEqual([]);
      expect(extractPromptVariables('Prompt with invalid {{?{curly brace}}}')).toEqual([]);
    });
  });

  describe('parsePromptVariable', () => {
    it('should return a plain label with no options when there is no pipe', () => {
      expect(parsePromptVariable('Token')).toEqual({ label: 'Token', options: null, multi: false, defaults: [] });
      expect(parsePromptVariable('Enter Port Variable')).toEqual({ label: 'Enter Port Variable', options: null, multi: false, defaults: [] });
    });

    it('should parse a label and a list of options', () => {
      expect(parsePromptVariable('Country|US,UK,DE')).toEqual({ label: 'Country', options: ['US', 'UK', 'DE'], multi: false, defaults: [] });
    });

    it('should parse a multi-select prompt when a double pipe is used', () => {
      expect(parsePromptVariable('Regions||US,UK,DE')).toEqual({ label: 'Regions', options: ['US', 'UK', 'DE'], multi: true, defaults: [] });
    });

    it('should trim the label, options, and drop empty options', () => {
      expect(parsePromptVariable('Country | US , UK ,DE ')).toEqual({ label: 'Country', options: ['US', 'UK', 'DE'], multi: false, defaults: [] });
      expect(parsePromptVariable('Env|dev,,prod,')).toEqual({ label: 'Env', options: ['dev', 'prod'], multi: false, defaults: [] });
      expect(parsePromptVariable('Regions|| US , UK ')).toEqual({ label: 'Regions', options: ['US', 'UK'], multi: true, defaults: [] });
    });

    it('should support a single option', () => {
      expect(parsePromptVariable('Region|us-east-1')).toEqual({ label: 'Region', options: ['us-east-1'], multi: false, defaults: [] });
    });

    it('should treat option values with dots as literal values', () => {
      expect(parsePromptVariable('Rate|1.5,2.5')).toEqual({ label: 'Rate', options: ['1.5', '2.5'], multi: false, defaults: [] });
    });

    it('should return null options when the pipe has no non-empty values', () => {
      expect(parsePromptVariable('X|')).toEqual({ label: 'X', options: null, multi: false, defaults: [] });
      expect(parsePromptVariable('X|,,')).toEqual({ label: 'X', options: null, multi: false, defaults: [] });
      expect(parsePromptVariable('X||')).toEqual({ label: 'X', options: null, multi: true, defaults: [] });
    });

    it('should preselect an option marked with a leading asterisk and strip the marker', () => {
      expect(parsePromptVariable('Env|dev,*stage,prod')).toEqual({ label: 'Env', options: ['dev', 'stage', 'prod'], multi: false, defaults: ['stage'] });
      expect(parsePromptVariable('Env| dev , * stage ,prod')).toEqual({ label: 'Env', options: ['dev', 'stage', 'prod'], multi: false, defaults: ['stage'] });
    });

    it('should preselect only the first starred option for a single-select', () => {
      expect(parsePromptVariable('Env|*dev,*stage,prod')).toEqual({ label: 'Env', options: ['dev', 'stage', 'prod'], multi: false, defaults: ['dev'] });
    });

    it('should preselect every starred option for a multi-select', () => {
      expect(parsePromptVariable('Regions||*us,eu,*ap')).toEqual({ label: 'Regions', options: ['us', 'eu', 'ap'], multi: true, defaults: ['us', 'ap'] });
    });

    it('should drop a bare asterisk option with no value', () => {
      expect(parsePromptVariable('Env|*,dev')).toEqual({ label: 'Env', options: ['dev'], multi: false, defaults: [] });
    });
  });
});
