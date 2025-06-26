const { describe, it, expect, jest, beforeEach, afterEach } = require('@jest/globals');

// Mock CodeMirror
const mockCodeMirror = {
  commands: {},
  registerHelper: jest.fn(),
  defineMode: jest.fn()
};

jest.mock('codemirror', () => mockCodeMirror);

// Mock @usebruno/common
jest.mock('@usebruno/common', () => ({
  mockDataFunctions: {
    randomInt: () => 123,
    randomFloat: () => 1.23,
    randomString: () => 'test',
    randomBoolean: () => true,
    randomEmail: () => 'test@example.com',
    randomUrl: () => 'https://example.com',
    randomUuid: () => '123e4567-e89b-12d3-a456-426614174000'
  }
}));

// Import the functions to test
import { 
  getAutoCompleteHints, 
  setupAutoComplete 
} from './autocomplete';

describe('Bruno Autocomplete', () => {
  let mockCm;

  beforeEach(() => {
    mockCm = {
      getCursor: jest.fn(),
      getLine: jest.fn(),
      getRange: jest.fn(),
      getMode: jest.fn(() => ({ name: 'javascript' })),
      showHint: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      state: {}
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAutoCompleteHints', () => {
    describe('Variable context ({{}})', () => {
      it('should provide variable hints when typing inside {{}}', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 9 });
        mockCm.getLine.mockReturnValue('{{envVar');
        mockCm.getRange.mockReturnValue('{{envVar');
        const allVariables = {
          envVar1: 'value1',
          envVar2: 'value2',
          collection: { var1: 'cval1' }
        };

        const result = getAutoCompleteHints(mockCm, allVariables, {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ text: 'envVar1', displayText: 'envVar1' }),
            expect.objectContaining({ text: 'envVar2', displayText: 'envVar2' })
          ])
        );
      });

      it('should include mock data functions with $ prefix', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 9 });
        mockCm.getLine.mockReturnValue('{{$randomI');
        mockCm.getRange.mockReturnValue('{{$randomI');
        
        const result = getAutoCompleteHints(mockCm, {}, {
          showHintsFor: ['variables']
        });

        expect(result.list).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ displayText: '$randomInt' })
          ])
        );
      });

      it('should handle process environment variables', () => {
        const allVariables = {
          process: {
            env: {
              NODE_ENV: 'development',
              API_URL: 'https://api.example.com'
            }
          }
        };

        mockCm.getCursor.mockReturnValue({ line: 0, ch: 14 });
        mockCm.getLine.mockReturnValue('{{process.env.N');
        mockCm.getRange.mockReturnValue('{{process.env.N');

        const result = getAutoCompleteHints(mockCm, allVariables, {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ displayText: 'NODE_ENV' })
          ])
        );
      });

      it('should handle nested object variables', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 12 });
        mockCm.getLine.mockReturnValue('{{config.api.}}');
        mockCm.getRange.mockReturnValue('{{config.api.');

        const allVariables = {
          'config.api.url': 'https://api.example.com',
          'config.api.key': 'secret',
          'config.app.name': 'MyApp'
        };

        const result = getAutoCompleteHints(mockCm, allVariables, {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ displayText: 'url' }),
            expect.objectContaining({ displayText: 'key' })
          ])
        );
      });

      it('should skip special internal keys', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 10 });
        mockCm.getLine.mockReturnValue('{{varName}}');
        mockCm.getRange.mockReturnValue('{{path');

        const allVariables = {
          pathParams: { id: '123' },
          maskedEnvVariables: { secret: '***' },
          path: 'value'
        };

        const result = getAutoCompleteHints(mockCm, allVariables, {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ displayText: 'path' })
          ])
        );
        expect(result.list).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ displayText: 'pathParams' })
          ])
        );
      });
    });

    describe('API object context (req, res, bru)', () => {
      const testCases = [
        {
          name: 'req object',
          input: 'req.',
          expected: ['url', 'method', 'headers', 'body', 'timeout']
        },
        {
          name: 'res object',
          input: 'res.',
          expected: ['status', 'statusText', 'headers', 'body', 'responseTime']
        },
        {
          name: 'bru object',
          input: 'bru.',
          expected: ['cwd()', 'getEnvName()', 'getProcessEnv(key)', 'hasEnvVar(key)', 'getEnvVar(key)']
        }
      ];

      testCases.forEach(({ name, input, expected }) => {
        it(`should provide ${name} hints`, () => {
          mockCm.getCursor.mockReturnValue({ line: 0, ch: input.length });
          mockCm.getLine.mockReturnValue(input);
          mockCm.getRange.mockReturnValue(input);

          const result = getAutoCompleteHints(mockCm, {}, {
            showHintsFor: ['req', 'res', 'bru']
          });

          expect(result).toBeTruthy();
          expect(result.list).toEqual(expect.arrayContaining(expected));
        });
      });

      it('should provide method hints for nested req objects', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 7 });
        mockCm.getLine.mockReturnValue('req.get');
        mockCm.getRange.mockReturnValue('req.get');

        const result = getAutoCompleteHints(mockCm, {}, {
          showHintsFor: ['req']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining([
            'getUrl()',
            'getMethod()',
            'getAuthMode()',
            'getHeader(name)',
            'getHeaders()',
            'getBody()',
            'getTimeout()',
            'getExecutionMode()',
            'getName()'
          ])
        );
      });

      it('should handle bru.runner sub-object', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 11 });
        mockCm.getLine.mockReturnValue('bru.runner.');
        mockCm.getRange.mockReturnValue('bru.runner.');

        const result = getAutoCompleteHints(mockCm, {}, {
          showHintsFor: ['bru']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining([
            'setNextRequest(requestName)',
            'skipRequest()',
            'stopExecution()'
          ])
        );
      });
    });

    describe('Custom hints and anyword context', () => {
      it('should provide custom anyword hints', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 7 });
        mockCm.getLine.mockReturnValue('custom.');
        mockCm.getRange.mockReturnValue('custom.');

        const options = {
          anywordAutocompleteHints: ['custom.method1', 'custom.method2', 'custom.property']
        };

        const result = getAutoCompleteHints(mockCm, {}, options, {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining(['method1', 'method2', 'property'])
        );
      });

      it('should handle progressive hints for custom hints', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 6 });
        mockCm.getLine.mockReturnValue('utils.');
        mockCm.getRange.mockReturnValue('utils.');

        const options = {
          anywordAutocompleteHints: ['utils.string.trim', 'utils.string.capitalize', 'utils.array.map']
        };

        const result = getAutoCompleteHints(mockCm, {}, options, {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining(['string', 'array'])
        );
      });
    });

    describe('Filtering and options', () => {
      beforeEach(() => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 4 });
        mockCm.getLine.mockReturnValue('req.');
        mockCm.getRange.mockReturnValue('req.');
      });

      it('should respect showHintsFor option for excluding hints', () => {
        const options = { showHintsFor: ['res', 'bru'] };
        const result = getAutoCompleteHints(mockCm, {}, options, {
          showHintsFor: ['req']
        });

        expect(result).toBeNull();
      });

      it('should show hints when included in showHintsFor', () => {
        const options = { showHintsFor: ['req'] };
        const result = getAutoCompleteHints(mockCm, {}, options, {
          showHintsFor: ['req']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining(['url', 'method'])
        );
      });

      it('should filter variables based on showHintsFor', () => {
        mockCm.getLine.mockReturnValue('{{varNa}}');
        mockCm.getRange.mockReturnValue('{{varNa');

        const allVariables = { envVar1: 'value1' };
        const options = { showHintsFor: ['req', 'res', 'bru'] };

        const result = getAutoCompleteHints(mockCm, allVariables, options);

        expect(result).toBeNull();
      });

      it('should limit results to 50 hints', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 10 });
        mockCm.getLine.mockReturnValue('{{varName}}');
        mockCm.getRange.mockReturnValue('{{v');

        const allVariables = {};
        for (let i = 0; i < 100; i++) {
          allVariables[`var${i}`] = `value${i}`;
        }

        const result = getAutoCompleteHints(mockCm, allVariables, {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list.length).toBeLessThanOrEqual(50);
      });

      it('should sort hints alphabetically', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 10 });
        mockCm.getLine.mockReturnValue('{{v.');
        mockCm.getRange.mockReturnValue('{{v.');

        const allVariables = {
          'v.zebra': 'value1',
          'v.apple': 'value2',
          'v.banana': 'value3'
        };

        const result = getAutoCompleteHints(mockCm, allVariables, {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        const displayTexts = result.list.map(item => 
          typeof item === 'object' ? item.displayText : item
        );
        
        const userVars = displayTexts.filter(text => !text.startsWith('$'));
        expect(userVars).toEqual(['apple', 'banana', 'zebra']);
      });
    });

    describe('Edge cases', () => {
      it('should return null when no word is found at cursor', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 0 });
        mockCm.getLine.mockReturnValue('   ');
        mockCm.getRange.mockReturnValue('');

        const result = getAutoCompleteHints(mockCm, {});

        expect(result).toBeNull();
      });

      it('should handle empty or null variables', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 10 });
        mockCm.getLine.mockReturnValue('{{varName}}');
        mockCm.getRange.mockReturnValue('{{varName');

        const emptyResult = getAutoCompleteHints(mockCm, {});
        const nullResult = getAutoCompleteHints(mockCm, null);

        expect(emptyResult).toBeNull();
        expect(nullResult).toBeNull();
      });

      it('should handle cursor at end of line', () => {
        const line = 'req.getHea';
        mockCm.getCursor.mockReturnValue({ line: 0, ch: line.length });
        mockCm.getLine.mockReturnValue(line);
        mockCm.getRange.mockReturnValue(line);

        const result = getAutoCompleteHints(mockCm, {}, {
          showHintsFor: ['req']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining(['getHeader(name)', 'getHeaders()'])
        );
      });

      it('should handle case-sensitive matching', () => {
        mockCm.getCursor.mockReturnValue({ line: 0, ch: 10 });
        mockCm.getLine.mockReturnValue('{{varName}}');
        mockCm.getRange.mockReturnValue('{{var');

        const allVariables = {
          variable1: 'value1',
          Variable2: 'value2',
          VARIABLE3: 'value3'
        };

        const result = getAutoCompleteHints(mockCm, allVariables, {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list.length).toBe(1);
      });
    });
  });

  describe('setupAutoComplete', () => {
    let mockGetAllVariables;
    let cleanupFn;

    beforeEach(() => {
      mockGetAllVariables = jest.fn(() => ({ var1: 'value1' }));
      mockCm.state = {};
    });

    afterEach(() => {
      if (cleanupFn) {
        cleanupFn();
      }
    });

    describe('Setup and cleanup', () => {
      it('should setup keyup event listener and return cleanup function', () => {
        cleanupFn = setupAutoComplete(mockCm, mockGetAllVariables);

        expect(mockCm.on).toHaveBeenCalledWith('keyup', expect.any(Function));
        expect(cleanupFn).toBeInstanceOf(Function);

        cleanupFn();
        expect(mockCm.off).toHaveBeenCalledWith('keyup', expect.any(Function));
      });

      it('should not setup if editor is null', () => {
        const result = setupAutoComplete(null, mockGetAllVariables);

        expect(result).toBeUndefined();
        expect(mockCm.on).not.toHaveBeenCalled();
      });
    });

    describe('Event handling', () => {
      it('should trigger hints on character key press', () => {
        cleanupFn = setupAutoComplete(mockCm, mockGetAllVariables, {
          showHintsFor: ['req']
        });
        const keyupHandler = mockCm.on.mock.calls[0][1];

        mockCm.getCursor.mockReturnValue({ line: 0, ch: 4 });
        mockCm.getLine.mockReturnValue('req.');
        mockCm.getRange.mockReturnValue('req.');

        const mockEvent = { key: 'a' };
        keyupHandler(mockCm, mockEvent);

        expect(mockGetAllVariables).toHaveBeenCalled();
        expect(mockCm.showHint).toHaveBeenCalled();
      });

      it('should not trigger hints on non-character keys', () => {
        cleanupFn = setupAutoComplete(mockCm, mockGetAllVariables);
        const keyupHandler = mockCm.on.mock.calls[0][1];

        const nonCharacterKeys = ['Shift', 'Tab', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'Meta'];

        nonCharacterKeys.forEach(key => {
          const mockEvent = { key };
          keyupHandler(mockCm, mockEvent);
        });

        expect(mockCm.showHint).not.toHaveBeenCalled();
      });

      it('should close existing completion when no hints available', () => {
        cleanupFn = setupAutoComplete(mockCm, mockGetAllVariables);
        const keyupHandler = mockCm.on.mock.calls[0][1];

        const mockCompletion = { close: jest.fn() };
        mockCm.state.completionActive = mockCompletion;

        mockCm.getCursor.mockReturnValue({ line: 0, ch: 0 });
        mockCm.getLine.mockReturnValue('   ');
        mockCm.getRange.mockReturnValue('');

        const mockEvent = { key: 'a' };
        keyupHandler(mockCm, mockEvent);

        expect(mockCompletion.close).toHaveBeenCalled();
      });

      it('should pass options to getAutoCompleteHints', () => {
        const options = { showHintsFor: ['req'] };
        cleanupFn = setupAutoComplete(mockCm, mockGetAllVariables, options);
        const keyupHandler = mockCm.on.mock.calls[0][1];

        mockCm.getCursor.mockReturnValue({ line: 0, ch: 4 });
        mockCm.getLine.mockReturnValue('req.');
        mockCm.getRange.mockReturnValue('req.');

        const mockEvent = { key: 'a' };
        keyupHandler(mockCm, mockEvent);

        expect(mockCm.showHint).toHaveBeenCalledWith({
          hint: expect.any(Function),
          completeSingle: false
        });
      });
    });
  });

  describe('CodeMirror integration', () => {
    it('should define autocomplete command if not exists', () => {
      delete mockCodeMirror.commands.autocomplete;

      jest.isolateModules(() => {
        require('./autocomplete');
      });

      expect(mockCodeMirror.commands.autocomplete).toBeDefined();
      expect(typeof mockCodeMirror.commands.autocomplete).toBe('function');
    });

    it('should not override existing autocomplete command', () => {
      const existingCommand = jest.fn();
      mockCodeMirror.commands.autocomplete = existingCommand;

      jest.isolateModules(() => {
        require('./autocomplete');
      });

      expect(mockCodeMirror.commands.autocomplete).toBe(existingCommand);
    });
  });
}); 