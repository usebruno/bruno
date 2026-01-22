/**
 * Test utilities and helpers for hooks testing
 */
import { Page, expect } from '../../playwright';
import { runCollection, validateRunnerResults, getRunnerResultCounts, setSandboxMode } from './page';

/**
 * Predefined hook test scenarios
 */
export const HOOK_TEST_SCENARIOS = {
  COLLECTION_LEVEL: 'collection-level',
  FOLDER_LEVEL: 'folder-level',
  REQUEST_LEVEL: 'request-level',
  MULTI_LEVEL: 'multi-level',
  ERROR_HANDLING: 'error-handling',
  CONSOLIDATED: 'consolidated'
} as const;

/**
 * Hook event names for testing
 */
export const HOOK_EVENTS = {
  BEFORE_REQUEST: 'http:beforeRequest',
  AFTER_RESPONSE: 'http:afterResponse',
  BEFORE_COLLECTION_RUN: 'runner:beforeCollectionRun',
  AFTER_COLLECTION_RUN: 'runner:afterCollectionRun'
} as const;

/**
 * Generates a mock hooks script for testing
 * @param options - Configuration options
 * @returns Generated hooks script
 */
export const generateMockHooksScript = (options: {
  level: 'collection' | 'folder' | 'request';
  events?: Array<keyof typeof HOOK_EVENTS>;
  includeVariableModification?: boolean;
  includeError?: boolean;
  includeConsoleLog?: boolean;
}) => {
  const {
    level,
    events = ['BEFORE_REQUEST', 'AFTER_RESPONSE'],
    includeVariableModification = false,
    includeError = false,
    includeConsoleLog = true
  } = options;

  const lines: string[] = [];

  for (const event of events) {
    const eventName = HOOK_EVENTS[event];
    const handlerName = event === 'BEFORE_REQUEST' ? 'onBeforeRequest' : 'onAfterResponse';
    const hookType = event === 'BEFORE_REQUEST' ? 'bru.hooks.http.onBeforeRequest' : 'bru.hooks.http.onAfterResponse';

    lines.push(`${hookType}(async ({ req, res, request, response }) => {`);

    if (includeConsoleLog) {
      lines.push(`  console.log('[${level}] ${eventName} hook executed');`);
    }

    if (includeVariableModification) {
      lines.push(`  bru.setVar('hook_${level}_executed', true);`);
    }

    if (includeError) {
      lines.push(`  throw new Error('Intentional error from ${level} hook');`);
    }

    lines.push(`});`);
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Validates that hooks executed in the correct order
 * Checks console log output for hook execution markers
 * @param page - The Playwright page object
 * @param expectedOrder - Expected hook execution order
 */
export const validateHookExecutionOrder = async (
  page: Page,
  expectedOrder: string[]
) => {
  // This would need to check console output or test results
  // For now, this is a placeholder for the actual implementation
  // that would depend on how the UI exposes hook execution logs
  console.log('Validating hook execution order:', expectedOrder);
};

/**
 * Runs a hooks test collection with specific configuration
 * @param page - The Playwright page object
 * @param collectionName - Name of the test collection
 * @param sandboxMode - 'developer' or 'safe' mode
 */
export const runHooksTestCollection = async (
  page: Page,
  collectionName: string,
  sandboxMode: 'developer' | 'safe' = 'safe'
) => {
  await setSandboxMode(page, collectionName, sandboxMode);
  await runCollection(page, collectionName);
};

/**
 * Creates a test case for hooks with configurable assertions
 * @param options - Test configuration
 */
export interface HooksTestOptions {
  collectionName: string;
  sandboxMode: 'developer' | 'safe';
  expectedResults: {
    totalRequests: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  timeout?: number;
}

export const createHooksTest = (options: HooksTestOptions) => {
  return async (page: Page) => {
    const { collectionName, sandboxMode, expectedResults, timeout = 5 * 60 * 1000 } = options;

    await setSandboxMode(page, collectionName, sandboxMode);
    await runCollection(page, collectionName);
    await validateRunnerResults(page, expectedResults);
  };
};

/**
 * Verifies hook-related variables were set correctly
 * @param page - The Playwright page object
 * @param expectedVariables - Map of variable names to expected values
 */
export const verifyHookVariables = async (
  page: Page,
  expectedVariables: Record<string, unknown>
) => {
  // This would need to check the variables panel or use the debug console
  // Placeholder for actual implementation
  console.log('Verifying hook variables:', expectedVariables);
};

/**
 * Performance helper to measure hook execution time
 */
export const measureHookPerformance = async (
  page: Page,
  runTest: () => Promise<void>
) => {
  const startTime = performance.now();
  await runTest();
  const endTime = performance.now();

  return {
    duration: endTime - startTime,
    durationMs: Math.round(endTime - startTime)
  };
};

/**
 * Compares performance of consolidated vs individual hook execution
 * @param page - The Playwright page object
 * @param collectionName - Collection to test
 * @param iterations - Number of test iterations
 */
export const compareConsolidatedVsIndividual = async (
  page: Page,
  collectionName: string,
  iterations: number = 3
) => {
  const results = {
    consolidated: [] as number[],
    individual: [] as number[]
  };

  // This would need separate collections configured for each mode
  // Placeholder for actual implementation

  return {
    consolidatedAvg: results.consolidated.reduce((a, b) => a + b, 0) / results.consolidated.length,
    individualAvg: results.individual.reduce((a, b) => a + b, 0) / results.individual.length,
    improvement: 0 // Percentage improvement
  };
};

/**
 * Error scenario helpers
 */
export const errorScenarios = {
  /**
   * Creates a hooks script that throws at a specific point
   */
  createErrorScript: (errorPoint: 'before_request' | 'after_response' | 'both') => {
    const scripts: string[] = [];

    if (errorPoint === 'before_request' || errorPoint === 'both') {
      scripts.push(`
bru.hooks.http.onBeforeRequest(async () => {
  throw new Error('Intentional beforeRequest error');
});
      `);
    }

    if (errorPoint === 'after_response' || errorPoint === 'both') {
      scripts.push(`
bru.hooks.http.onAfterResponse(async () => {
  throw new Error('Intentional afterResponse error');
});
      `);
    }

    return scripts.join('\n');
  },

  /**
   * Creates a hooks script with async error
   */
  createAsyncErrorScript: () => `
bru.hooks.http.onBeforeRequest(async () => {
  await new Promise((_, reject) => setTimeout(() => reject(new Error('Async error')), 100));
});
  `,

  /**
   * Creates a hooks script with syntax error
   */
  createSyntaxErrorScript: () => `
bru.hooks.http.onBeforeRequest(async () => {
  // Syntax error - missing closing brace
  if (true) {
    console.log('test')
  // missing }
});
  `
};

/**
 * Variable scoping test helpers
 */
export const variableScopingTests = {
  /**
   * Creates hooks that test variable inheritance
   */
  createVariableInheritanceScript: (level: 'collection' | 'folder' | 'request') => `
bru.hooks.http.onBeforeRequest(async () => {
  const existingVar = bru.getVar('testVar');
  console.log('[${level}] Inherited var:', existingVar);
  bru.setVar('testVar', (existingVar || '') + '-${level}');
});
  `,

  /**
   * Creates hooks that test environment variable access
   */
  createEnvVarAccessScript: (level: 'collection' | 'folder' | 'request') => `
bru.hooks.http.onBeforeRequest(async () => {
  const envVar = bru.getEnvVar('testEnvVar');
  console.log('[${level}] Env var:', envVar);
  bru.setEnvVar('hookModified_${level}', 'true');
});
  `
};
