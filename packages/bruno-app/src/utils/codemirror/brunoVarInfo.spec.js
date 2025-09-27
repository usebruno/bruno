import { interpolate } from '@usebruno/common';
import { extractVariableInfo, renderVarInfo } from './brunoVarInfo';

// Mock the dependencies
jest.mock('@usebruno/common', () => ({
  interpolate: jest.fn()
}));

describe('extractVariableInfo', () => {
  let mockVariables;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock variables
    mockVariables = {
      apiKey: 'test-api-key-123',
      baseUrl: 'https://api.example.com',
      userId: 12345,
      pathParams: {
        id: 'user-123',
        slug: 'test-post'
      }
    };

    // Setup interpolate mock
    interpolate.mockImplementation((value, variables) => {
      if (typeof value === 'string' && value.includes('{{')) {
        return value.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
      }
      return value;
    });
  });

  describe('input validation', () => {
    it('should return undefined for null input', () => {
      const result = extractVariableInfo(null, mockVariables);
      expect(result.variableName).toBeUndefined();
      expect(result.variableValue).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      const result = extractVariableInfo(undefined, mockVariables);
      expect(result.variableName).toBeUndefined();
      expect(result.variableValue).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = extractVariableInfo('', mockVariables);
      expect(result.variableName).toBeUndefined();
      expect(result.variableValue).toBeUndefined();
    });

    it('should return undefined for non-string input', () => {
      const result = extractVariableInfo(123, mockVariables);
      expect(result.variableName).toBeUndefined();
      expect(result.variableValue).toBeUndefined();
    });

    it('should return undefined for object input', () => {
      const result = extractVariableInfo({}, mockVariables);
      expect(result.variableName).toBeUndefined();
      expect(result.variableValue).toBeUndefined();
    });
  });

  describe('double brace format ({{variableName}})', () => {
    it('should parse double brace variables correctly', () => {
      const result = extractVariableInfo('{{apiKey}}', mockVariables);

      expect(result).toEqual({
        variableName: 'apiKey',
        variableValue: 'test-api-key-123'
      });

      expect(interpolate).toHaveBeenCalledWith('test-api-key-123', mockVariables);
    });

    it('should handle whitespace in double brace variables', () => {
      const result = extractVariableInfo('{{  apiKey  }}', mockVariables);

      expect(result).toEqual({
        variableName: 'apiKey',
        variableValue: 'test-api-key-123'
      });
    });

    it('should return undefined variableValue for non-existent double brace variable', () => {
      const result = extractVariableInfo('{{nonExistent}}', mockVariables);

      expect(result).toEqual({
        variableName: 'nonExistent',
        variableValue: undefined
      });
    });
  });

  describe('path parameter format (/:variableName)', () => {
    it('should parse path parameter variables correctly', () => {
      const result = extractVariableInfo('/:id', mockVariables);

      expect(result).toEqual({
        variableName: 'id',
        variableValue: 'user-123'
      });
    });

    it('should return undefined for non-existent path parameter', () => {
      const result = extractVariableInfo('/:nonExistent', mockVariables);

      expect(result).toEqual({
        variableName: 'nonExistent',
        variableValue: undefined
      });
    });

    it('should handle missing pathParams object', () => {
      const variablesWithoutPathParams = { ...mockVariables };
      delete variablesWithoutPathParams.pathParams;

      const result = extractVariableInfo('/:id', variablesWithoutPathParams);

      expect(result).toEqual({
        variableName: 'id',
        variableValue: undefined
      });
    });

    it('should handle null pathParams', () => {
      const variablesWithNullPathParams = { ...mockVariables, pathParams: null };

      const result = extractVariableInfo('/:id', variablesWithNullPathParams);

      expect(result).toEqual({
        variableName: 'id',
        variableValue: undefined
      });
    });
  });

  describe('direct variable format', () => {
    it('should parse direct variable names correctly', () => {
      const result = extractVariableInfo('baseUrl', mockVariables);

      expect(result).toEqual({
        variableName: 'baseUrl',
        variableValue: 'https://api.example.com'
      });

      expect(interpolate).toHaveBeenCalledWith('https://api.example.com', mockVariables);
    });

    it('should handle numeric variable values', () => {
      const result = extractVariableInfo('userId', mockVariables);

      expect(result).toEqual({
        variableName: 'userId',
        variableValue: 12345
      });
    });

    it('should return undefined for non-existent direct variable', () => {
      const result = extractVariableInfo('nonExistent', mockVariables);

      expect(result).toEqual({
        variableName: 'nonExistent',
        variableValue: undefined
      });
    });

    it('should handle variables with special characters', () => {
      mockVariables['special-var_name'] = 'special-var_value';

      const result = extractVariableInfo('special-var_name', mockVariables);

      expect(result).toEqual({
        variableName: 'special-var_name',
        variableValue: 'special-var_value'
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty variables object', () => {
      const result = extractVariableInfo('{{apiKey}}', {});

      expect(result).toEqual({
        variableName: 'apiKey',
        variableValue: undefined
      });
    });

    it('should handle null variables object', () => {
      const result = extractVariableInfo('{{apiKey}}', null);

      expect(result).toEqual({
        variableName: 'apiKey',
        variableValue: undefined
      });
    });

    it('should handle undefined variables object', () => {
      const result = extractVariableInfo('{{apiKey}}', undefined);

      expect(result).toEqual({
        variableName: 'apiKey',
        variableValue: undefined
      });
    });
  });

  describe('return value structure', () => {
    it('should always return an object with variableName and variableValue properties', () => {
      const result = extractVariableInfo('{{apiKey}}', mockVariables);

      expect(result).toHaveProperty('variableName');
      expect(result).toHaveProperty('variableValue');
      expect(typeof result.variableName).toBe('string');
    });

    it('should return variableValue as the interpolated value', () => {
      const result = extractVariableInfo('{{apiKey}}', mockVariables);

      expect(result.variableValue).toBe('test-api-key-123');
    });
  });
});

describe('renderVarInfo', () => {
  let clipboardText = '';

  beforeEach(() => {
    jest.clearAllMocks();

    // setup mock clipboard
    clipboardText = '';
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn((text) => {
          clipboardText = text;
          return Promise.resolve();
        })
      },
      configurable: true
    });
  });

  function setupRender(variables) {
    const result = renderVarInfo({ string: '{{apiKey}}' }, { variables });
    const contentDiv = result.querySelector('.info-content');
    const descriptionDiv = contentDiv.querySelector('.info-description');
    const copyButton = contentDiv.querySelector('.copy-button');

    return { result, contentDiv, descriptionDiv, copyButton };
  }

  describe('popup functionality', () => {
    it('should create a popup', () => {
      const { result } = setupRender({ apiKey: 'test-value' });

      expect(result).toBeDefined();
    });

    it('should create a popup with the correct variable name and value', () => {
      const { descriptionDiv } = setupRender({ apiKey: 'test-value' });

      expect(descriptionDiv.textContent).toBe('test-value');
    });

    it('should correctly mask the variable value in the popup', () => {
      const { descriptionDiv } = setupRender({
        apiKey: 'test-value',
        maskedEnvVariables: ['apiKey']
      });

      expect(descriptionDiv.textContent).toBe('*****');
    });
  });

  describe('copy button functionality', () => {
    it('should create a copy button', () => {
      const { copyButton } = setupRender({ apiKey: 'test-value' });
      
      expect(copyButton).toBeDefined();
    });

    it('should copy the variable value to the clipboard', async () => {
      const { copyButton } = setupRender({ apiKey: 'test-value' });

      await copyButton.click();

      expect(clipboardText).toBe('test-value');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-value');
    });

    it('should copy the variable value of masked variables to the clipboard', async () => {
      const { copyButton } = setupRender({ apiKey: 'test-value', maskedEnvVariables: ['apiKey'] });

      await copyButton.click();

      expect(clipboardText).toBe('test-value');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-value');
    });
  });
});
