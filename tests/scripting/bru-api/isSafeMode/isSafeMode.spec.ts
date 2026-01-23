import { test } from '../../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../../utils/page';

test.describe.parallel('bru.isSafeMode() API', () => {
  test('returns false when running in developer mode', async ({ pageWithUserData: page }) => {
    // Set up developer mode
    await setSandboxMode(page, 'is-safe-mode-test', 'developer');

    // Run the collection
    await runCollection(page, 'is-safe-mode-test');

    // Validate test results
    // In developer mode:
    // - test-safe-mode-false should PASS (expects false, gets false)
    // - test-safe-mode-true should FAIL (expects true, gets false)
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 1,
      failed: 1,
      skipped: 0
    });
  });

  test('returns true when running in safe mode', async ({ pageWithUserData: page }) => {
    // Set up safe mode
    await setSandboxMode(page, 'is-safe-mode-test', 'safe');

    // Run the collection
    await runCollection(page, 'is-safe-mode-test');

    // Validate test results
    // In safe mode:
    // - test-safe-mode-false should FAIL (expects false, gets true)
    // - test-safe-mode-true should PASS (expects true, gets true)
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 1,
      failed: 1,
      skipped: 0
    });
  });
});
