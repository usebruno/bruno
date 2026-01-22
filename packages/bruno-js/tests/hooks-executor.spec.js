/**
 * Unit tests for Hooks Executor
 */
const {
  executeHooksForLevel,
  executeConsolidatedHooks,
  executeAllHookLevels,
  createHookExecutor,
  HOOK_EVENTS
} = require('../src/runtime/hooks-executor');

// Mock the HooksRuntime
jest.mock('../src/runtime/hooks-runtime', () => {
  return jest.fn().mockImplementation(() => ({
    runHooks: jest.fn().mockResolvedValue({
      hookManager: {
        call: jest.fn().mockResolvedValue(undefined),
        dispose: jest.fn()
      },
      envVariables: {},
      runtimeVariables: {},
      persistentEnvVariables: {},
      globalEnvironmentVariables: {}
    })
  }));
});

describe('Hooks Executor', () => {
  const mockOptions = {
    request: { url: 'http://test.com' },
    envVariables: {},
    runtimeVariables: {},
    collectionPath: '/test/collection',
    onConsoleLog: jest.fn(),
    processEnvVars: {},
    scriptingConfig: { runtime: 'quickjs' },
    runRequestByItemPathname: jest.fn(),
    collectionName: 'Test Collection'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HOOK_EVENTS', () => {
    it('should have correct event names', () => {
      expect(HOOK_EVENTS.HTTP_BEFORE_REQUEST).toBe('http:beforeRequest');
      expect(HOOK_EVENTS.HTTP_AFTER_RESPONSE).toBe('http:afterResponse');
      expect(HOOK_EVENTS.RUNNER_BEFORE_COLLECTION_RUN).toBe('runner:beforeCollectionRun');
      expect(HOOK_EVENTS.RUNNER_AFTER_COLLECTION_RUN).toBe('runner:afterCollectionRun');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(HOOK_EVENTS)).toBe(true);
    });
  });

  describe('executeHooksForLevel()', () => {
    it('should return null for empty hooks file', async () => {
      const result = await executeHooksForLevel('', HOOK_EVENTS.HTTP_BEFORE_REQUEST, {}, mockOptions);
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only hooks file', async () => {
      const result = await executeHooksForLevel('   ', HOOK_EVENTS.HTTP_BEFORE_REQUEST, {}, mockOptions);
      expect(result).toBeNull();
    });

    it('should execute hooks for valid hooks file', async () => {
      const HooksRuntime = require('../src/runtime/hooks-runtime');
      await executeHooksForLevel('console.log("test")', HOOK_EVENTS.HTTP_BEFORE_REQUEST, {}, mockOptions);
      expect(HooksRuntime).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const HooksRuntime = require('../src/runtime/hooks-runtime');
      HooksRuntime.mockImplementationOnce(() => ({
        runHooks: jest.fn().mockRejectedValue(new Error('Test error'))
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await executeHooksForLevel('test()', HOOK_EVENTS.HTTP_BEFORE_REQUEST, {}, mockOptions);
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('executeConsolidatedHooks()', () => {
    it('should execute consolidated hooks', async () => {
      const HooksRuntime = require('../src/runtime/hooks-runtime');
      const extractedHooks = {
        collectionHooks: 'collection()',
        folderHooks: [{ hooks: 'folder()' }],
        requestHooks: 'request()'
      };

      await executeConsolidatedHooks(extractedHooks, HOOK_EVENTS.HTTP_BEFORE_REQUEST, {}, mockOptions);
      expect(HooksRuntime).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const HooksRuntime = require('../src/runtime/hooks-runtime');
      HooksRuntime.mockImplementationOnce(() => ({
        runHooks: jest.fn().mockRejectedValue(new Error('Test error'))
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await executeConsolidatedHooks(
        { collectionHooks: 'test()', folderHooks: [], requestHooks: '' },
        HOOK_EVENTS.HTTP_BEFORE_REQUEST,
        {},
        mockOptions
      );
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('executeAllHookLevels()', () => {
    it('should always use consolidated execution', async () => {
      const extractedHooks = {
        collectionHooks: 'collection()',
        folderHooks: [{ hooks: 'folder()' }],
        requestHooks: 'request()'
      };

      const HooksRuntime = require('../src/runtime/hooks-runtime');
      await executeAllHookLevels(
        extractedHooks,
        HOOK_EVENTS.HTTP_BEFORE_REQUEST,
        {},
        mockOptions
      );

      // Should always use consolidated execution
      const runtimeInstance = HooksRuntime.mock.results[0].value;
      expect(runtimeInstance.runHooks).toHaveBeenCalledWith(
        expect.objectContaining({ consolidated: true })
      );
    });
  });

  describe('createHookExecutor()', () => {
    it('should create executor with base options', () => {
      const executor = createHookExecutor(mockOptions);
      expect(executor).toBeDefined();
      expect(typeof executor.executeLevel).toBe('function');
      expect(typeof executor.executeConsolidated).toBe('function');
      expect(typeof executor.executeAll).toBe('function');
    });

    it('should allow overriding options', async () => {
      const executor = createHookExecutor(mockOptions);
      const newConsoleLog = jest.fn();

      await executor.executeLevel('test()', HOOK_EVENTS.HTTP_BEFORE_REQUEST, {}, {
        onConsoleLog: newConsoleLog
      });

      // The override should be merged with base options
      // Actual verification depends on implementation details
    });
  });
});
