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

  const hookTypeMap: Record<string, string> = {
    BEFORE_REQUEST: 'bru.hooks.http.onBeforeRequest',
    AFTER_RESPONSE: 'bru.hooks.http.onAfterResponse',
    BEFORE_COLLECTION_RUN: 'bru.hooks.runner.onBeforeCollectionRun',
    AFTER_COLLECTION_RUN: 'bru.hooks.runner.onAfterCollectionRun'
  };

  for (const event of events) {
    const eventName = HOOK_EVENTS[event];
    const hookType = hookTypeMap[event];

    if (!hookType) {
      throw new Error(`Unknown hook event: ${event}`);
    }

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
