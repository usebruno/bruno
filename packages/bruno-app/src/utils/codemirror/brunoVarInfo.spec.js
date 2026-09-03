import { interpolate } from '@usebruno/common';
import RealCodeMirror from 'codemirror';
import store from 'providers/ReduxStore';
import {
  getVariableScope,
  isVariableSecret,
  findEnvironmentInCollection,
  getTreePathFromCollectionToItem,
  findCollectionByUid,
  findItemInCollectionByItemUid,
  getAvailableAddToScopes
} from 'utils/collections';
import { updateVariableInScope, addEnvironment, selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { COPY_SUCCESS_TIMEOUT, extractVariableInfo, renderVarInfo } from './brunoVarInfo';

// Mock the dependencies
jest.mock('@usebruno/common', () => ({
  interpolate: jest.fn(),
  mockDataFunctions: {
    randomFirstName: jest.fn(() => 'John'),
    randomLastName: jest.fn(() => 'Doe'),
    randomEmail: jest.fn(() => 'john.doe@example.com'),
    randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    timestamp: jest.fn(() => '1704067200'),
    isoTimestamp: jest.fn(() => '2024-01-01T00:00:00.000Z')
  },
  timeBasedDynamicVars: new Set(['timestamp', 'isoTimestamp'])
}));

jest.mock('providers/ReduxStore', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
    getState: jest.fn()
  }
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  updateVariableInScope: jest.fn(),
  openCollectionSettings: jest.fn(),
  addEnvironment: jest.fn(),
  selectEnvironment: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/global-environments', () => ({
  addGlobalEnvironment: jest.fn()
}));

jest.mock('utils/collections', () => ({
  getVariableScope: jest.fn(),
  isVariableSecret: jest.fn(),
  getAllVariables: jest.fn(),
  findEnvironmentInCollection: jest.fn(),
  getTreePathFromCollectionToItem: jest.fn(),
  findCollectionByUid: jest.fn(),
  findItemInCollectionByItemUid: jest.fn(),
  findParentItemInCollection: jest.fn(),
  getAvailableAddToScopes: jest.fn(() => []),
  isItemARequest: jest.fn((item) => !!item && item.type !== 'folder')
}));

jest.mock('utils/common/codemirror', () => ({
  defineCodeMirrorBrunoVariablesMode: jest.fn()
}));

jest.mock('utils/common/masked-editor', () => ({
  MaskedEditor: jest.fn(() => ({
    enable: jest.fn(),
    disable: jest.fn()
  }))
}));

jest.mock('utils/codemirror/autocomplete', () => ({
  setupAutoComplete: jest.fn(() => jest.fn())
}));

// Mock CodeMirror
global.CodeMirror = jest.fn((element, options) => {
  const mockEditor = {
    getValue: jest.fn(() => options.value || ''),
    setValue: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    refresh: jest.fn(),
    focus: jest.fn(),
    options: options || {},
    getWrapperElement: jest.fn(() => element)
  };
  return mockEditor;
});

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

    it('should return undefined for empty double brace variables', () => {
      const result = extractVariableInfo('{{}}', mockVariables);

      expect(result).toEqual({
        variableName: undefined,
        variableValue: undefined
      });
    });

    it('should return undefined for whitespace-only double brace variables', () => {
      const result = extractVariableInfo('{{   }}', mockVariables);

      expect(result).toEqual({
        variableName: undefined,
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

    it('should return undefined for empty path parameters', () => {
      const result = extractVariableInfo('/:', mockVariables);

      expect(result).toEqual({
        variableName: undefined,
        variableValue: undefined
      });
    });

    it('should return undefined for whitespace-only path parameters', () => {
      const result = extractVariableInfo('/:   ', mockVariables);

      expect(result).toEqual({
        variableName: undefined,
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
    jest.useFakeTimers();

    store.getState.mockReturnValue({
      globalEnvironments: {
        globalEnvironments: [],
        activeGlobalEnvironmentUid: null
      }
    });

    findEnvironmentInCollection.mockReturnValue(null);
    getTreePathFromCollectionToItem.mockReturnValue([]);
    getAvailableAddToScopes.mockReturnValue([]);
    findCollectionByUid.mockImplementation((collections, uid) => (collections || []).find((c) => c.uid === uid) || null);
    findItemInCollectionByItemUid.mockReturnValue(null);
    getVariableScope.mockReturnValue({
      type: 'request',
      value: 'test-value',
      data: { item: { uid: 'req-1' }, variable: { uid: 'var-1', name: 'apiKey', value: 'test-value' } }
    });

    // setup mock clipboard
    clipboardText = '';
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn((text) => {
          if (text === 'cause-clipboard-error') {
            return Promise.reject(new Error('Clipboard error'));
          }

          clipboardText = text;

          return Promise.resolve();
        })
      },
      configurable: true
    });

    // mock console.error
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setupRender(variables, collection = null, item = null) {
    const result = renderVarInfo({ string: '{{apiKey}}' }, { variables, collection, item });
    if (!result) return { result: null, containerDiv: null, valueDisplay: null, copyButton: null };

    const containerDiv = result;
    const valueDisplay = containerDiv.querySelector('.var-value-editable-display') || containerDiv.querySelector('.var-value-display');
    const copyButton = containerDiv.querySelector('.copy-button');

    return { result, containerDiv, valueDisplay, copyButton };
  }

  describe('popup functionality', () => {
    it('should create a popup', () => {
      const { result } = setupRender({ apiKey: 'test-value' });

      expect(result).toBeDefined();
    });

    it('should create a popup with the correct variable name and value', () => {
      const { valueDisplay } = setupRender({ apiKey: 'test-value' });

      expect(valueDisplay.textContent).toBe('test-value');
    });

    it('should correctly mask the variable value in the popup', () => {
      const { valueDisplay } = setupRender({
        apiKey: 'test-value',
        maskedEnvVariables: ['apiKey']
      });

      expect(valueDisplay.textContent).toBe('**********');
    });
  });

  describe('copy button functionality', () => {
    it('should create a copy button', () => {
      const { copyButton } = setupRender({ apiKey: 'test-value' });

      expect(copyButton).toBeDefined();
    });

    it('should copy the variable value to the clipboard', () => {
      const { copyButton } = setupRender({ apiKey: 'test-value' });

      copyButton.click();

      expect(clipboardText).toBe('test-value');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-value');
    });

    it('should copy the variable value of masked variables to the clipboard', () => {
      const { copyButton } = setupRender({ apiKey: 'test-value', maskedEnvVariables: ['apiKey'] });

      copyButton.click();

      expect(clipboardText).toBe('test-value');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-value');
    });

    it('should show a success checkmark when the variable value is copied', async () => {
      const { copyButton } = setupRender({ apiKey: 'test-value' });

      expect(copyButton.classList.contains('copy-success')).toBe(false);

      await copyButton.click();

      expect(copyButton.classList.contains('copy-success')).toBe(true);

      jest.advanceTimersByTime(COPY_SUCCESS_TIMEOUT);

      expect(copyButton.classList.contains('copy-success')).toBe(false);
    });

    it('should copy plain object values as formatted JSON', async () => {
      const { copyButton } = setupRender({ apiKey: { host: 'localhost', port: 8080 } });

      copyButton.click();
      await jest.runAllTimersAsync();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        JSON.stringify({ host: 'localhost', port: 8080 }, null, 2)
      );
    });

    it('should fall back to String() for circular objects and still write to clipboard', async () => {
      const circular = {};
      circular.self = circular;
      const { copyButton } = setupRender({ apiKey: circular });

      copyButton.click();
      await jest.runAllTimersAsync();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(String(circular));
    });

    it('should log to the console when the variable value is not copied', async () => {
      const { copyButton } = setupRender({ apiKey: 'cause-clipboard-error' });

      copyButton.click();

      // wait for .catch() microtask to run
      await jest.runAllTimersAsync();

      expect(clipboardText).toBe('');
      expect(console.error).toHaveBeenCalledWith('Failed to copy to clipboard:', 'Clipboard error');
    });
  });

  describe('dynamic/faker variable rendering', () => {
    function setupDynamicRender(variableName, variables = {}) {
      const result = renderVarInfo({ string: `{{${variableName}}}` }, { variables, collection: null, item: null });
      if (!result) return { result: null, containerDiv: null };

      const containerDiv = result;
      const header = containerDiv.querySelector('.var-info-header');
      const scopeBadge = containerDiv.querySelector('.var-scope-badge');
      const readOnlyNote = containerDiv.querySelector('.var-readonly-note');
      const warningNote = containerDiv.querySelector('.var-warning-note');
      const valueContainer = containerDiv.querySelector('.var-value-container');

      return { result, containerDiv, header, scopeBadge, readOnlyNote, warningNote, valueContainer };
    }

    it('should show read-only note for dynamic variables', () => {
      const { readOnlyNote } = setupDynamicRender('$randomFirstName');

      expect(readOnlyNote).not.toBeNull();
      expect(readOnlyNote.textContent).toBe('Generates random value on each request');
    });

    it('should not show value container for valid dynamic variables', () => {
      const { valueContainer } = setupDynamicRender('$randomFirstName');

      // Value is generated at runtime, so no value display
      expect(valueContainer).toBeNull();
    });

    it('should show warning for unknown dynamic variable', () => {
      const { warningNote, scopeBadge } = setupDynamicRender('$unknownFaker');

      expect(scopeBadge.textContent).toBe('Dynamic');
      expect(warningNote).not.toBeNull();
      expect(warningNote.textContent).toContain('Unknown dynamic variable');
    });

    it('should show time-based note for $timestamp variable', () => {
      const { readOnlyNote, scopeBadge } = setupDynamicRender('$timestamp');

      expect(scopeBadge.textContent).toBe('Dynamic');
      expect(readOnlyNote).not.toBeNull();
      expect(readOnlyNote.textContent).toBe('Generates current timestamp on each request');
    });

    it('should show time-based note for $isoTimestamp variable', () => {
      const { readOnlyNote, scopeBadge } = setupDynamicRender('$isoTimestamp');

      expect(scopeBadge.textContent).toBe('Dynamic');
      expect(readOnlyNote).not.toBeNull();
      expect(readOnlyNote.textContent).toBe('Generates current timestamp on each request');
    });

    it('should show random note for non-time-based dynamic variables', () => {
      const { readOnlyNote } = setupDynamicRender('$randomEmail');

      expect(readOnlyNote).not.toBeNull();
      expect(readOnlyNote.textContent).toBe('Generates random value on each request');
    });
  });

  describe('new variable — Add to switcher', () => {
    it('shows the Add-to switcher with the guessed scope pre-selected, excluding Folder', () => {
      getVariableScope.mockReturnValue(null);
      getAvailableAddToScopes.mockReturnValue([
        { type: 'request', label: 'Request Variable', enabled: true, supportsSecret: false },
        { type: 'collection', label: 'Collection Variable', enabled: true, supportsSecret: false },
        { type: 'environment', label: 'Collection Environment', enabled: true, supportsSecret: true },
        { type: 'global', label: 'Global Environment', enabled: true, supportsSecret: true }
      ]);

      const result = renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1', activeEnvironmentUid: 'env-1' },
          item: { uid: 'req-1', type: 'http-request' }
        }
      );

      // Guessed scope shows up as the header badge, same as any other variable.
      const scopeBadge = result.querySelector('.var-scope-badge');
      expect(scopeBadge.textContent).toBe('Request');

      const switcher = result.querySelector('.var-add-to-switcher');
      expect(switcher).not.toBeNull();

      switcher.querySelector('.var-add-to-toggle').click();

      expect(switcher.querySelector('[data-testid="var-info-add-to-option-request"]')).not.toBeNull();
      expect(switcher.querySelector('[data-testid="var-info-add-to-option-collection"]')).not.toBeNull();
      expect(switcher.querySelector('[data-testid="var-info-add-to-option-environment"]')).not.toBeNull();
      expect(switcher.querySelector('[data-testid="var-info-add-to-option-global"]')).not.toBeNull();
      // Folder is not offered as a creatable scope yet.
      expect(switcher.querySelector('[data-testid="var-info-add-to-option-folder"]')).toBeNull();

      const activeRow = switcher.querySelector('.var-add-to-option-active');
      expect(activeRow.querySelector('[data-testid="var-info-add-to-option-request"]')).not.toBeNull();
    });

    it('resolves the Environment scope against the real active environment, not whichever environment is being displayed', () => {
      getVariableScope.mockReturnValue(null);
      getAvailableAddToScopes.mockReturnValue([]);
      const freshCollection = {
        uid: 'col-1',
        activeEnvironmentUid: 'env-prod',
        environments: [{ uid: 'env-prod', name: 'Prod' }]
      };
      store.getState.mockReturnValue({
        globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null },
        collections: {
          collections: [freshCollection]
        }
      });
      findCollectionByUid.mockReturnValue(freshCollection);

      renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1', activeEnvironmentUid: 'env-stage' },
          item: null
        }
      );

      expect(getAvailableAddToScopes).toHaveBeenCalledWith(
        expect.objectContaining({ activeEnvironmentUid: 'env-prod' })
      );
    });

    it('targets the folder itself (not its parent) when opened from that folder\'s own settings, and pre-selects it', () => {
      getVariableScope.mockReturnValue(null);
      const folderItem = { uid: 'folder-1', type: 'folder', name: 'Auth' };
      getAvailableAddToScopes.mockReturnValue([
        { type: 'collection', label: 'Collection Variable', enabled: true, supportsSecret: false },
        { type: 'environment', label: 'Collection Environment', enabled: true, supportsSecret: true },
        { type: 'folder', label: 'Folder', enabled: true, supportsSecret: false }
      ]);

      const result = renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1', activeEnvironmentUid: 'env-1' },
          item: folderItem
        }
      );

      // The folder scope targets the folder being edited itself (labeled "Folder"), not a parent.
      expect(getAvailableAddToScopes).toHaveBeenCalledWith(
        expect.objectContaining({ parentFolder: folderItem, isSelfFolder: true })
      );

      const switcher = result.querySelector('.var-add-to-switcher');
      switcher.querySelector('.var-add-to-toggle').click();

      const activeRow = switcher.querySelector('.var-add-to-option-active');
      expect(activeRow.querySelector('[data-testid="var-info-add-to-option-folder"]')).not.toBeNull();
    });

    it('repoints the scope badge when a different scope is picked, without saving immediately', () => {
      getVariableScope.mockReturnValue(null);
      getAvailableAddToScopes.mockReturnValue([
        { type: 'request', label: 'Request Variable', enabled: true, supportsSecret: false },
        { type: 'collection', label: 'Collection Variable', enabled: true, supportsSecret: false }
      ]);

      const result = renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1' },
          item: { uid: 'req-1', type: 'http-request' }
        }
      );

      const scopeBadge = result.querySelector('.var-scope-badge');
      expect(scopeBadge.textContent).toBe('Request');

      const switcher = result.querySelector('.var-add-to-switcher');
      switcher.querySelector('.var-add-to-toggle').click();
      switcher.querySelector('[data-testid="var-info-add-to-option-collection"]').click();

      expect(scopeBadge.textContent).toBe('Collection');
      // Picking an existing scope only repoints where the next blur-save writes to.
      expect(updateVariableInScope).not.toHaveBeenCalled();
    });

    it('shows "Create One" when no environment exists, creates and selects the environment, and saves the variable once the tooltip is dismissed', async () => {
      getVariableScope.mockReturnValue(null);
      getAvailableAddToScopes.mockReturnValue([
        { type: 'collection', label: 'Collection Variable', enabled: true, supportsSecret: false },
        { type: 'environment', label: 'Collection Environment', enabled: false, supportsSecret: true }
      ]);

      const collectionBeforeCreate = { uid: 'col-1', activeEnvironmentUid: null, environments: [] };
      const collectionAfterCreate = {
        uid: 'col-1',
        activeEnvironmentUid: 'env-new',
        environments: [{ uid: 'env-new', name: 'Dev', variables: [] }]
      };

      store.getState.mockReturnValue({
        globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null },
        collections: { collections: [collectionAfterCreate] }
      });
      // No "Dev" exists yet for the initial render's lookup and the duplicate-name check inside
      // onCreateEnvironment; once addEnvironment resolves, later lookups (waitForEnvironmentByName)
      // see it created.
      findCollectionByUid
        .mockReturnValueOnce(collectionBeforeCreate)
        .mockReturnValueOnce(collectionBeforeCreate)
        .mockReturnValue(collectionAfterCreate);
      addEnvironment.mockReturnValue(() => Promise.resolve());
      selectEnvironment.mockReturnValue(() => Promise.resolve());
      getVariableScope.mockReturnValue(null);
      store.dispatch.mockImplementation(() => Promise.resolve());

      const result = renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1' },
          item: null
        }
      );

      const switcher = result.querySelector('.var-add-to-switcher');
      const valueContainer = result.querySelector('.var-value-container');
      switcher.querySelector('.var-add-to-toggle').click();

      const createLink = switcher.querySelector('[data-testid="var-info-add-to-create-env-button"]');
      expect(createLink).not.toBeNull();
      createLink.click();

      const nameInput = switcher.querySelector('[data-testid="var-info-add-to-create-env-name-input"]');
      nameInput.value = 'Dev';
      switcher.querySelector('[data-testid="var-info-add-to-create-env-submit"]').click();

      await jest.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      expect(addEnvironment).toHaveBeenCalledWith('Dev', 'col-1');
      // Creating and selecting the environment only repoints the pending scope. it doesn't
      // save the variable.
      expect(updateVariableInScope).not.toHaveBeenCalled();
      // adding a new env will not close the switcher
      expect(switcher.querySelector('.var-add-to-list').style.display).toBe('block');

      valueContainer._cmEditor.getValue = () => 'a-new-value';
      await valueContainer._persistNewVariable();

      expect(updateVariableInScope).toHaveBeenCalledWith(
        'missingVar',
        'a-new-value',
        expect.objectContaining({ type: 'environment' }),
        'col-1'
      );
    });

    it('adds variable as a secret if secret is selected when creating the environment, instead of always saving as a plain variable', async () => {
      getVariableScope.mockReturnValue(null);
      getAvailableAddToScopes.mockReturnValue([
        { type: 'collection', label: 'Collection Variable', enabled: true, supportsSecret: false },
        { type: 'environment', label: 'Collection Environment', enabled: false, supportsSecret: true }
      ]);

      const collectionBeforeCreate = { uid: 'col-1', activeEnvironmentUid: null, environments: [] };
      const collectionAfterCreate = {
        uid: 'col-1',
        activeEnvironmentUid: 'env-new',
        environments: [{ uid: 'env-new', name: 'Dev', variables: [] }]
      };

      store.getState.mockReturnValue({
        globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null },
        collections: { collections: [collectionAfterCreate] }
      });
      findCollectionByUid
        .mockReturnValueOnce(collectionBeforeCreate)
        .mockReturnValueOnce(collectionBeforeCreate)
        .mockReturnValue(collectionAfterCreate);
      addEnvironment.mockReturnValue(() => Promise.resolve());
      selectEnvironment.mockReturnValue(() => Promise.resolve());
      getVariableScope.mockReturnValue(null);
      store.dispatch.mockImplementation(() => Promise.resolve());

      const result = renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1' },
          item: null
        }
      );

      const switcher = result.querySelector('.var-add-to-switcher');
      const valueContainer = result.querySelector('.var-value-container');
      switcher.querySelector('.var-add-to-toggle').click();

      const createLink = switcher.querySelector('[data-testid="var-info-add-to-create-env-button"]');
      createLink.click();

      // Tick Secret before creating the environment.
      const secretCheckbox = switcher.querySelector('[data-testid="var-info-add-to-secret-checkbox"]');
      secretCheckbox.checked = true;
      secretCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

      const nameInput = switcher.querySelector('[data-testid="var-info-add-to-create-env-name-input"]');
      nameInput.value = 'Dev';
      switcher.querySelector('[data-testid="var-info-add-to-create-env-submit"]').click();

      await jest.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      valueContainer._cmEditor.getValue = () => 'a-secret-value';
      await valueContainer._persistNewVariable();

      expect(updateVariableInScope).toHaveBeenCalledWith(
        'missingVar',
        expect.any(String),
        expect.objectContaining({ data: expect.objectContaining({ secret: true }) }),
        'col-1'
      );
    });

    it('rejects an environment name that would be rewritten by the main process, instead of risking a false "failed to create" report', async () => {
      // Regression: `sanitizeName` (main process) strips characters like ':' before writing the
      // file. Without this check, the create would actually succeed under a different, sanitized
      // name, but `waitForEnvironmentByName` (which polls by the originally-typed name) would
      // never find a match and time out, falsely reporting a failure.
      getVariableScope.mockReturnValue(null);
      getAvailableAddToScopes.mockReturnValue([
        { type: 'collection', label: 'Collection Variable', enabled: true, supportsSecret: false },
        { type: 'environment', label: 'Collection Environment', enabled: false, supportsSecret: true }
      ]);

      findCollectionByUid.mockReturnValue({ uid: 'col-1', activeEnvironmentUid: null, environments: [] });
      store.getState.mockReturnValue({
        globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null },
        collections: { collections: [{ uid: 'col-1', activeEnvironmentUid: null, environments: [] }] }
      });

      const result = renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1' },
          item: null
        }
      );

      const switcher = result.querySelector('.var-add-to-switcher');
      switcher.querySelector('.var-add-to-toggle').click();
      switcher.querySelector('[data-testid="var-info-add-to-create-env-button"]').click();

      const nameInput = switcher.querySelector('[data-testid="var-info-add-to-create-env-name-input"]');
      nameInput.value = 'Prod:Env';
      switcher.querySelector('[data-testid="var-info-add-to-create-env-submit"]').click();

      await Promise.resolve();
      await Promise.resolve();

      expect(addEnvironment).not.toHaveBeenCalled();
      const errorNote = switcher.querySelector('[data-testid="var-info-add-to-error"]');
      expect(errorNote.textContent).not.toBe('');
    });

    it('rejects a name that only differs in case from an existing environment, instead of risking a same-file overwrite', async () => {
      // Regression: `generateUniqueName` (main process) compares names case-sensitively, so
      // "Dev" would be considered unique even with "dev" already on disk. On a case-insensitive
      // filesystem that write silently overwrites the existing "dev" environment's file.
      getVariableScope.mockReturnValue(null);
      getAvailableAddToScopes.mockReturnValue([
        { type: 'collection', label: 'Collection Variable', enabled: true, supportsSecret: false },
        { type: 'environment', label: 'Collection Environment', enabled: false, supportsSecret: true }
      ]);

      const collectionWithDev = {
        uid: 'col-1',
        activeEnvironmentUid: 'env-existing',
        environments: [{ uid: 'env-existing', name: 'dev', variables: [] }]
      };
      findCollectionByUid.mockReturnValue(collectionWithDev);
      store.getState.mockReturnValue({
        globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null },
        collections: { collections: [collectionWithDev] }
      });

      const result = renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1' },
          item: null
        }
      );

      const switcher = result.querySelector('.var-add-to-switcher');
      switcher.querySelector('.var-add-to-toggle').click();
      switcher.querySelector('[data-testid="var-info-add-to-create-env-button"]').click();

      const nameInput = switcher.querySelector('[data-testid="var-info-add-to-create-env-name-input"]');
      nameInput.value = 'Dev';
      switcher.querySelector('[data-testid="var-info-add-to-create-env-submit"]').click();

      await Promise.resolve();
      await Promise.resolve();

      expect(addEnvironment).not.toHaveBeenCalled();
      const errorNote = switcher.querySelector('[data-testid="var-info-add-to-error"]');
      expect(errorNote.textContent).toBe('Environment already exists');
    });

    it('does not save on blur for a brand new variable, even if the value changed', () => {
      getVariableScope.mockReturnValue(null);
      getAvailableAddToScopes.mockReturnValue([
        { type: 'request', label: 'Request Variable', enabled: true, supportsSecret: false }
      ]);

      const result = renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1' },
          item: { uid: 'req-1', type: 'http-request' }
        }
      );

      // brunoVarInfo.js uses the real `codemirror` package (not the `global.CodeMirror` mock
      // defined above, which nothing in the source references) — grab the real editor instance
      // it stashed on the value container and fire its registered blur handler directly via
      // CodeMirror's own signal API instead of simulating real DOM focus/blur.
      const cmEditor = result.querySelector('.var-value-container')._cmEditor;
      cmEditor.getValue = () => 'a-new-value';
      RealCodeMirror.signal(cmEditor, 'blur');

      expect(updateVariableInScope).not.toHaveBeenCalled();
    });

    it('recomputes masking fresh on each blur, so removing a secret reference actually un-masks the value', () => {
      // Regression: masking used to be computed as `currentShouldMaskValue || newHasSecretRefs`,
      // which is sticky — once a value referenced a secret, masking could never turn back off
      // within the same tooltip session, even after the reference was removed.
      getVariableScope.mockImplementation((name) => {
        if (name === 'secretVar') {
          return { type: 'environment', data: { variable: { secret: true } } };
        }
        return null;
      });
      isVariableSecret.mockImplementation((scopeInfo) => !!scopeInfo?.data?.variable?.secret);
      getAvailableAddToScopes.mockReturnValue([
        { type: 'environment', label: 'Collection Environment', enabled: true, supportsSecret: true }
      ]);
      interpolate.mockImplementation((value) => value);

      const activeCollection = {
        uid: 'col-1',
        activeEnvironmentUid: 'env-1',
        environments: [{ uid: 'env-1', name: 'Dev', variables: [] }]
      };
      findCollectionByUid.mockReturnValue(activeCollection);
      store.getState.mockReturnValue({
        globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null },
        collections: { collections: [activeCollection] }
      });

      const result = renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1' },
          item: null
        }
      );

      const cmEditor = result.querySelector('.var-value-container')._cmEditor;
      const valueDisplay = result.querySelector('[data-testid="var-info-value-editable"]');

      // Reference a secret variable — masking should turn on.
      cmEditor.getValue = () => '{{secretVar}}';
      RealCodeMirror.signal(cmEditor, 'blur');
      expect(valueDisplay.textContent).toBe('*'.repeat('{{secretVar}}'.length));

      // Remove the secret reference — masking should turn back off, not stay stuck on.
      cmEditor.getValue = () => 'plainvalue';
      RealCodeMirror.signal(cmEditor, 'blur');
      expect(valueDisplay.textContent).toBe('plainvalue');
    });

    it('saves the pending value via _persistNewVariable when the tooltip is dismissed with an outside click', async () => {
      getVariableScope.mockReturnValue(null);
      getAvailableAddToScopes.mockReturnValue([
        { type: 'request', label: 'Request Variable', enabled: true, supportsSecret: false }
      ]);
      store.dispatch.mockImplementation(() => Promise.resolve());
      store.getState.mockReturnValue({
        globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null },
        collections: { collections: [{ uid: 'col-1' }] }
      });
      findCollectionByUid.mockReturnValue({ uid: 'col-1' });

      const result = renderVarInfo(
        { string: '{{missingVar}}' },
        {
          variables: {},
          collection: { uid: 'col-1' },
          item: { uid: 'req-1', type: 'http-request' }
        }
      );

      const valueContainer = result.querySelector('.var-value-container');
      expect(typeof valueContainer._persistNewVariable).toBe('function');

      // _persistNewVariable is a no-op unless the value actually changed from what the
      // editor was initialized with (see brunoVarInfo.js), so simulate an edit first.
      valueContainer._cmEditor.getValue = () => 'a-new-value';

      await valueContainer._persistNewVariable();

      expect(updateVariableInScope).toHaveBeenCalledWith(
        'missingVar',
        expect.any(String),
        expect.objectContaining({ type: 'request' }),
        'col-1'
      );
    });
  });

  describe('go to definition', () => {
    it('should render the variable name as the go-to-definition link for persisted variables', () => {
      const { containerDiv } = setupRender({ apiKey: 'test-value' }, { uid: 'col-1' }, { uid: 'req-1' });
      const varName = containerDiv.querySelector('.var-name');

      expect(varName.classList.contains('var-name-link')).toBe(true);
    });

    it('should open the target request before navigating to its variable definition', () => {
      const renderedItem = { uid: 'req-current', type: 'http-request', pathname: '/current.bru' };
      const targetItem = { uid: 'req-target', type: 'http-request', pathname: '/target.bru' };
      getVariableScope.mockReturnValue({
        type: 'request',
        value: 'test-value',
        data: { item: targetItem, variable: { uid: 'var-1', name: 'apiKey', value: 'test-value' } }
      });

      const { containerDiv } = setupRender({ apiKey: 'test-value' }, { uid: 'col-1' }, renderedItem);
      const varName = containerDiv.querySelector('.var-name-link');

      varName.click();

      expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({
        payload: {
          uid: 'req-target',
          collectionUid: 'col-1',
          type: 'http-request',
          pathname: '/target.bru',
          requestPaneTab: 'vars'
        }
      }));
      expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { uid: 'req-target', requestPaneTab: 'vars' } }));
      expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { uid: 'req-target' } }));
    });
  });

  describe('OAuth2 variable rendering', () => {
    function setupOAuth2Render(variableName, variables = {}) {
      const result = renderVarInfo({ string: `{{${variableName}}}` }, { variables, collection: null, item: null });
      if (!result) return { result: null, containerDiv: null };

      const containerDiv = result;
      const header = containerDiv.querySelector('.var-info-header');
      const scopeBadge = containerDiv.querySelector('.var-scope-badge');
      const readOnlyNote = containerDiv.querySelector('.var-readonly-note');
      const warningNote = containerDiv.querySelector('.var-warning-note');
      const valueContainer = containerDiv.querySelector('.var-value-container');
      const valueDisplay = containerDiv.querySelector('.var-value-display');

      return { result, containerDiv, header, scopeBadge, readOnlyNote, warningNote, valueContainer, valueDisplay };
    }

    it('should show OAuth2 scope badge for $oauth2 variables', () => {
      const { scopeBadge } = setupOAuth2Render('$oauth2.credentials.access_token', {
        '$oauth2.credentials.access_token': 'test-token-123'
      });

      expect(scopeBadge.textContent).toBe('OAuth2');
    });

    it('should show read-only note for valid OAuth2 variables', () => {
      const { readOnlyNote } = setupOAuth2Render('$oauth2.credentials.access_token', {
        '$oauth2.credentials.access_token': 'test-token-123'
      });

      expect(readOnlyNote).not.toBeNull();
      expect(readOnlyNote.textContent).toBe('read-only');
    });

    it('should display the token value for valid OAuth2 variables', () => {
      const { valueDisplay } = setupOAuth2Render('$oauth2.credentials.access_token', {
        '$oauth2.credentials.access_token': 'test-token-123'
      });

      expect(valueDisplay).not.toBeNull();
      expect(valueDisplay.textContent).toBe('test-token-123');
    });

    it('should show warning for OAuth2 variable when token is not found', () => {
      const { warningNote, scopeBadge } = setupOAuth2Render('$oauth2.credentials.access_token', {});

      expect(scopeBadge.textContent).toBe('OAuth2');
      expect(warningNote).not.toBeNull();
      expect(warningNote.textContent).toContain('OAuth2 token not found');
    });
  });
});
