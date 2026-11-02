import { test } from '@e2e/test';
import { setSandboxMode, runCollection, validateRunnerResults } from '@e2e/pages';

test.describe.serial('basic ssl success', () => {
  test('developer mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up developer mode
    await setSandboxMode(page, 'badssl', 'developer');

    // Run the collection
    await runCollection(page, 'badssl');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 1,
      failed: 0,
      skipped: 0
    });
  });

  test('safe mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up safe mode
    await setSandboxMode(page, 'badssl', 'safe');

    // Run the collection
    await runCollection(page, 'badssl');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 1,
      failed: 0,
      skipped: 0
    });
  });
});
