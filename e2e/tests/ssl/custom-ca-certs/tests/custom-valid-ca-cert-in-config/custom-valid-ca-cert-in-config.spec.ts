import { test } from '@e2e/test';
import { setSandboxMode, runCollection, validateRunnerResults } from '@e2e/pages';

test.describe('custom valid ca cert added to the config and NO default ca certs', () => {
  test('developer mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up developer mode
    await setSandboxMode(page, 'custom-ca-certs', 'developer');

    // Run the collection
    await runCollection(page, 'custom-ca-certs');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0,
      skipped: 0
    });
  });

  test('safe mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up safe mode
    await setSandboxMode(page, 'custom-ca-certs', 'safe');

    // Run the collection
    await runCollection(page, 'custom-ca-certs');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0,
      skipped: 0
    });
  });
});
