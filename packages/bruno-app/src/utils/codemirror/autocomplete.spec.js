const { describe, it, expect, jest, beforeEach, afterEach } = require('@jest/globals');

const _mockedCodemirror = {
  commands: {},
  getCursor: jest.fn(),
  getLine: jest.fn(),
  getRange: jest.fn(),
  showHint: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  state: {}
};

jest.mock('codemirror', () => {
  return _mockedCodemirror;
});

// Import the functions to test
import {
  getAutoCompleteHints,
  setupAutoComplete
} from './autocomplete';

describe('Bruno Autocomplete', () => {
  let mockedCodemirror;

  beforeEach(() => {
    mockedCodemirror = _mockedCodemirror;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAutoCompleteHints', () => {
    describe('Variable autocomplete', () => {
      it('should provide variable hints when typing inside double curly braces', () => {
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 9 });
        mockedCodemirror.getLine.mockReturnValue('{{envVar}}');
        mockedCodemirror.getRange.mockReturnValue('{{envVar');
        const allVariables = {
          envVar1: 'value1',
          envVar2: 'value2'
        };

        const result = getAutoCompleteHints(mockedCodemirror, allVariables, [], {
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
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 9 });
        mockedCodemirror.getRange.mockReturnValue('{{$randomI');

        const result = getAutoCompleteHints(mockedCodemirror, {}, [], {
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

        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 14 });
        mockedCodemirror.getRange.mockReturnValue('{{process.env.N');

        const result = getAutoCompleteHints(mockedCodemirror, allVariables, [], {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ displayText: 'NODE_ENV' })
          ])
        );
      });

      it('should skip special internal keys', () => {
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 10 });
        mockedCodemirror.getRange.mockReturnValue('{{path');

        const allVariables = {
          pathParams: { id: '123' },
          maskedEnvVariables: { secret: '***' },
          path: 'value'
        };

        const result = getAutoCompleteHints(mockedCodemirror, allVariables, [], {
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

      it('should handle nested object variables', () => {
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 12 });
        mockedCodemirror.getRange.mockReturnValue('{{config.api.');

        const allVariables = {
          'config.api.url': 'https://echo.usebruno.com',
          'config.api.client_id': 'client_id',
          'config.api.client_secret': 'client_secret',
          'config.app.name': 'bruno'
        };

        const result = getAutoCompleteHints(mockedCodemirror, allVariables, [], {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ displayText: 'url' }),
            expect.objectContaining({ displayText: 'client_id' }),
            expect.objectContaining({ displayText: 'client_secret' })
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
          mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: input.length });
          mockedCodemirror.getLine.mockReturnValue(input);
          mockedCodemirror.getRange.mockReturnValue(input);

          const result = getAutoCompleteHints(mockedCodemirror, {}, [], {
            showHintsFor: ['req', 'res', 'bru']
          });

          expect(result).toBeTruthy();
          expect(result.list).toEqual(expect.arrayContaining(expected));
        });
      });

      it('should provide method hints for nested req objects', () => {
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 7 });
        mockedCodemirror.getLine.mockReturnValue('req.get');
        mockedCodemirror.getRange.mockReturnValue('req.get');

        const result = getAutoCompleteHints(mockedCodemirror, {}, [], {
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
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 11 });
        mockedCodemirror.getLine.mockReturnValue('bru.runner.');
        mockedCodemirror.getRange.mockReturnValue('bru.runner.');

        const result = getAutoCompleteHints(mockedCodemirror, {}, [], {
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
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 7 });
        mockedCodemirror.getLine.mockReturnValue('Content-');
        mockedCodemirror.getRange.mockReturnValue('Content-');

        const customHints = ['Content-Type', 'Content-Encoding', 'Content-Length'];

        const result = getAutoCompleteHints(mockedCodemirror, {}, customHints, {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining(['Content-Type', 'Content-Encoding', 'Content-Length'])
        );
      });

      it('should handle progressive hints for custom hints', () => {
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 6 });
        mockedCodemirror.getLine.mockReturnValue('utils.');
        mockedCodemirror.getRange.mockReturnValue('utils.');

        const customHints = ['utils.string.trim', 'utils.string.capitalize', 'utils.array.map'];

        const result = getAutoCompleteHints(mockedCodemirror, {}, customHints, {
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
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 4 });
        mockedCodemirror.getLine.mockReturnValue('req.');
        mockedCodemirror.getRange.mockReturnValue('req.');
      });

      it('should respect showHintsFor option for excluding hints', () => {
        const options = { showHintsFor: ['res', 'bru'] };
        const result = getAutoCompleteHints(mockedCodemirror, {}, [], options);

        expect(result).toBeNull();
      });

      it('should show hints when included in showHintsFor', () => {
        const options = { showHintsFor: ['req'] };
        const result = getAutoCompleteHints(mockedCodemirror, {}, [], options);

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining(['url', 'method'])
        );
      });

      it('should filter variables based on showHintsFor', () => {
        mockedCodemirror.getLine.mockReturnValue('{{varNa}}');
        mockedCodemirror.getRange.mockReturnValue('{{varNa');

        const allVariables = { envVar1: 'value1' };
        const options = { showHintsFor: ['req', 'res', 'bru'] };

        const result = getAutoCompleteHints(mockedCodemirror, allVariables, [], options);

        expect(result).toBeNull();
      });

      it('should limit results to 50 hints', () => {
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 10 });
        mockedCodemirror.getLine.mockReturnValue('{{varName}}');
        mockedCodemirror.getRange.mockReturnValue('{{v');

        const allVariables = {};
        for (let i = 0; i < 100; i++) {
          allVariables[`var${i}`] = `value${i}`;
        }

        const result = getAutoCompleteHints(mockedCodemirror, allVariables, [], {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list.length).toBeLessThanOrEqual(50);
      });

      it('should sort hints alphabetically', () => {
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 10 });
        mockedCodemirror.getLine.mockReturnValue('{{v.');
        mockedCodemirror.getRange.mockReturnValue('{{v.');

        const allVariables = {
          'v.zebra': 'value1',
          'v.apple': 'value2',
          'v.banana': 'value3'
        };

        const result = getAutoCompleteHints(mockedCodemirror, allVariables, [], {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        const displayTexts = result.list.map((item) =>
          typeof item === 'object' ? item.displayText : item
        );

        const userVars = displayTexts.filter((text) => !text.startsWith('$'));
        expect(userVars).toEqual(['apple', 'banana', 'zebra']);
      });
    });

    describe('Edge cases', () => {
      it('should return null when no word is found at cursor', () => {
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 0 });
        mockedCodemirror.getLine.mockReturnValue('   ');
        mockedCodemirror.getRange.mockReturnValue('');

        const result = getAutoCompleteHints(mockedCodemirror, {}, []);

        expect(result).toBeNull();
      });

      it('should handle empty or null variables', () => {
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 10 });
        mockedCodemirror.getLine.mockReturnValue('{{varName}}');
        mockedCodemirror.getRange.mockReturnValue('{{varName');

        const emptyResult = getAutoCompleteHints(mockedCodemirror, {}, []);
        const nullResult = getAutoCompleteHints(mockedCodemirror, null, []);

        expect(emptyResult).toBeNull();
        expect(nullResult).toBeNull();
      });

      it('should handle cursor at end of line', () => {
        const line = 'req.getHea';
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: line.length });
        mockedCodemirror.getLine.mockReturnValue(line);
        mockedCodemirror.getRange.mockReturnValue(line);

        const result = getAutoCompleteHints(mockedCodemirror, {}, [], {
          showHintsFor: ['req']
        });

        expect(result).toBeTruthy();
        expect(result.list).toEqual(
          expect.arrayContaining(['getHeader(name)', 'getHeaders()'])
        );
      });

      it('should handle case-insensitive matching', () => {
        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 10 });
        mockedCodemirror.getLine.mockReturnValue('{{varName}}');
        mockedCodemirror.getRange.mockReturnValue('{{var');

        const allVariables = {
          variable1: 'value1',
          Variable2: 'value2',
          VARIABLE3: 'value3'
        };

        const result = getAutoCompleteHints(mockedCodemirror, allVariables, [], {
          showHintsFor: ['variables']
        });

        expect(result).toBeTruthy();
        expect(result.list.length).toBe(3);
      });
    });
  });

  describe('setupAutoComplete', () => {
    let mockGetAllVariables;
    let cleanupFn;

    beforeEach(() => {
      mockGetAllVariables = jest.fn(() => ({ }));
      mockedCodemirror.state = {};
    });

    afterEach(() => {
      if (cleanupFn) {
        cleanupFn();
      }
    });

    describe('Setup and cleanup', () => {
      it('should setup keyup event listener and return cleanup function', () => {
        const options = { getAllVariables: mockGetAllVariables };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);

        expect(mockedCodemirror.on).toHaveBeenCalledWith('keyup', expect.any(Function));
        expect(cleanupFn).toBeInstanceOf(Function);

        cleanupFn();
        expect(mockedCodemirror.off).toHaveBeenCalledWith('keyup', expect.any(Function));
      });

      it('should not setup if editor is null', () => {
        const result = setupAutoComplete(null, { getAllVariables: mockGetAllVariables });

        expect(result).toBeUndefined();
        expect(mockedCodemirror.on).not.toHaveBeenCalled();
      });
    });

    describe('Event handling', () => {
      it('should trigger hints on character key press', () => {
        const options = {
          getAllVariables: mockGetAllVariables,
          showHintsFor: ['req']
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);
        const keyupHandler = mockedCodemirror.on.mock.calls[0][1];

        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 4 });
        mockedCodemirror.getLine.mockReturnValue('req.');
        mockedCodemirror.getRange.mockReturnValue('req.');

        const mockEvent = { key: 'a' };
        keyupHandler(mockedCodemirror, mockEvent);

        expect(mockGetAllVariables).toHaveBeenCalled();
        expect(mockedCodemirror.showHint).toHaveBeenCalled();
      });

      it('should not trigger hints on non-character keys', () => {
        const options = { getAllVariables: mockGetAllVariables };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);
        const keyupHandler = mockedCodemirror.on.mock.calls[0][1];

        const nonCharacterKeys = ['Shift', 'Tab', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'Meta'];

        nonCharacterKeys.forEach((key) => {
          const mockEvent = { key };
          keyupHandler(mockedCodemirror, mockEvent);
        });

        expect(mockedCodemirror.showHint).not.toHaveBeenCalled();
      });

      it('should close existing completion when no hints available', () => {
        const options = { getAllVariables: mockGetAllVariables };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);
        const keyupHandler = mockedCodemirror.on.mock.calls[0][1];

        const mockCompletion = { close: jest.fn() };
        mockedCodemirror.state.completionActive = mockCompletion;

        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 0 });
        mockedCodemirror.getLine.mockReturnValue('req.bodyy');
        mockedCodemirror.getRange.mockReturnValue('');

        const mockEvent = { key: 'a' };
        keyupHandler(mockedCodemirror, mockEvent);

        expect(mockCompletion.close).toHaveBeenCalled();
      });

      it('should pass options to getAutoCompleteHints', () => {
        const options = {
          getAllVariables: mockGetAllVariables,
          showHintsFor: ['req']
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);
        const keyupHandler = mockedCodemirror.on.mock.calls[0][1];

        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 4 });
        mockedCodemirror.getLine.mockReturnValue('req.');
        mockedCodemirror.getRange.mockReturnValue('req.');

        const mockEvent = { key: 'a' };
        keyupHandler(mockedCodemirror, mockEvent);

        expect(mockedCodemirror.showHint).toHaveBeenCalledWith({
          hint: expect.any(Function),
          completeSingle: false
        });
      });
    });

    describe('Click event handling (showHintsOnClick)', () => {
      it('should setup mousedown event listener when showHintsOnClick is enabled', () => {
        const options = {
          getAllVariables: mockGetAllVariables,
          showHintsOnClick: true
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);

        expect(mockedCodemirror.on).toHaveBeenCalledWith('keyup', expect.any(Function));
        expect(mockedCodemirror.on).toHaveBeenCalledWith('mousedown', expect.any(Function));
        expect(mockedCodemirror.on).toHaveBeenCalledTimes(2);
      });

      it('should not setup mousedown event listener when showHintsOnClick is disabled', () => {
        const options = {
          getAllVariables: mockGetAllVariables,
          showHintsOnClick: false
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);

        expect(mockedCodemirror.on).toHaveBeenCalledWith('keyup', expect.any(Function));
        expect(mockedCodemirror.on).toHaveBeenCalledTimes(1);
      });

      it('should not setup mousedown event listener when showHintsOnClick is undefined', () => {
        const options = {
          getAllVariables: mockGetAllVariables
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);

        expect(mockedCodemirror.on).toHaveBeenCalledWith('keyup', expect.any(Function));
        expect(mockedCodemirror.on).toHaveBeenCalledTimes(1);
      });

      it('should show hints on click when showHintsOnClick is enabled', () => {
        jest.useFakeTimers();

        const mockGetAnywordAutocompleteHints = jest.fn(() => ['Content-Type', 'Accept']);
        const options = {
          getAllVariables: mockGetAllVariables,
          getAnywordAutocompleteHints: mockGetAnywordAutocompleteHints,
          showHintsOnClick: true,
          showHintsFor: ['req', 'variables']
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);

        // Find the click handler (mousedown event)
        const clickHandler = mockedCodemirror.on.mock.calls.find((call) => call[0] === 'mousedown')[1];

        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 0 });

        clickHandler(mockedCodemirror);

        // Run all timers to execute the setTimeout
        jest.runAllTimers();

        expect(mockGetAllVariables).toHaveBeenCalled();
        expect(mockGetAnywordAutocompleteHints).toHaveBeenCalled();
        expect(mockedCodemirror.showHint).toHaveBeenCalled();

        jest.useRealTimers();
      });

      it('should not show hints on click when showHintsOnClick is disabled', () => {
        const options = {
          getAllVariables: mockGetAllVariables,
          showHintsOnClick: false
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);

        // There should be no mousedown handler
        const mousedownCalls = mockedCodemirror.on.mock.calls.filter((call) => call[0] === 'mousedown');
        expect(mousedownCalls).toHaveLength(0);
      });

      it('should cleanup mousedown event listener when showHintsOnClick was enabled', () => {
        const options = {
          getAllVariables: mockGetAllVariables,
          showHintsOnClick: true
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);

        cleanupFn();

        expect(mockedCodemirror.off).toHaveBeenCalledWith('keyup', expect.any(Function));
        expect(mockedCodemirror.off).toHaveBeenCalledWith('mousedown', expect.any(Function));
        expect(mockedCodemirror.off).toHaveBeenCalledTimes(2);
      });

      it('should only cleanup keyup event listener when showHintsOnClick was disabled', () => {
        const options = {
          getAllVariables: mockGetAllVariables,
          showHintsOnClick: false
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);

        cleanupFn();

        expect(mockedCodemirror.off).toHaveBeenCalledWith('keyup', expect.any(Function));
        expect(mockedCodemirror.off).toHaveBeenCalledTimes(1);
      });

      it('should show all available hints on click based on showHintsFor configuration', () => {
        jest.useFakeTimers();

        const mockGetAnywordAutocompleteHints = jest.fn(() => ['Content-Type', 'Accept']);
        const options = {
          getAllVariables: mockGetAllVariables.mockReturnValue({
            envVar1: 'value1',
            envVar2: 'value2'
          }),
          getAnywordAutocompleteHints: mockGetAnywordAutocompleteHints,
          showHintsOnClick: true,
          showHintsFor: ['req', 'variables']
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);

        // Find the click handler (mousedown event)
        const clickHandler = mockedCodemirror.on.mock.calls.find((call) => call[0] === 'mousedown')[1];

        const mockCursor = { line: 0, ch: 0 };
        mockedCodemirror.getCursor.mockReturnValue(mockCursor);

        clickHandler(mockedCodemirror);

        // Run all timers to execute the setTimeout
        jest.runAllTimers();

        expect(mockedCodemirror.showHint).toHaveBeenCalledWith({
          hint: expect.any(Function),
          completeSingle: false
        });

        // Verify the hint function returns the expected structure
        const hintCall = mockedCodemirror.showHint.mock.calls[0][0];
        const hintResult = hintCall.hint();

        expect(hintResult).toEqual({
          list: expect.any(Array),
          from: mockCursor,
          to: mockCursor
        });
        expect(hintResult.list.length).toBeGreaterThan(0);

        jest.useRealTimers();
      });

      it('should not show hints on click when no hints are available', () => {
        const options = {
          getAllVariables: mockGetAllVariables.mockReturnValue({}),
          getAnywordAutocompleteHints: jest.fn(() => []),
          showHintsOnClick: true,
          showHintsFor: []
        };
        cleanupFn = setupAutoComplete(mockedCodemirror, options);

        // Find the click handler (mousedown event)
        const clickHandler = mockedCodemirror.on.mock.calls.find((call) => call[0] === 'mousedown')[1];

        mockedCodemirror.getCursor.mockReturnValue({ line: 0, ch: 0 });

        clickHandler(mockedCodemirror);

        expect(mockedCodemirror.showHint).not.toHaveBeenCalled();
      });
    });
  });

  describe('CodeMirror integration', () => {
    it('should define autocomplete command if not exists', () => {
      delete mockedCodemirror.commands.autocomplete;

      jest.isolateModules(() => {
        require('./autocomplete');
      });

      expect(mockedCodemirror.commands.autocomplete).toBeDefined();
      expect(typeof mockedCodemirror.commands.autocomplete).toBe('function');
    });

    it('should not override existing autocomplete command', () => {
      const existingCommand = jest.fn();
      mockedCodemirror.commands.autocomplete = existingCommand;

      jest.isolateModules(() => {
        require('./autocomplete');
      });

      expect(mockedCodemirror.commands.autocomplete).toBe(existingCommand);
    });
  });
});
