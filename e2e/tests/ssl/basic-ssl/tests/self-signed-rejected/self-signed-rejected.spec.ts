import { test } from '@e2e/test';
import { setSandboxMode, runCollection, validateRunnerResults } from '@e2e/pages';

test.describe.serial('self signed rejected', () => {
  test('developer mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up developer mode
    await setSandboxMode(page, 'self-signed-badssl', 'developer');

    // Run the collection
    await runCollection(page, 'self-signed-badssl');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 0,
      failed: 1,
      skipped: 0
    });
  });

  test('safe mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up safe mode
    await setSandboxMode(page, 'self-signed-badssl', 'safe');

    // Run the collection
    await runCollection(page, 'self-signed-badssl');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 0,
      failed: 1,
      skipped: 0
    });
  });
});
