import { test } from '../../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../../utils/page';

test.describe.serial('jwt collection success', () => {
  test('developer mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up developer mode
    await setSandboxMode(page, 'jsonwebtoken', 'developer');

    // Run the collection
    await runCollection(page, 'jsonwebtoken');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 7,
      passed: 7,
      failed: 0,
      skipped: 0
    });
  });

  test('safe mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up safe mode
    await setSandboxMode(page, 'jsonwebtoken', 'safe');

    // Run the collection
    await runCollection(page, 'jsonwebtoken');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 7,
      passed: 7,
      failed: 0,
      skipped: 0
    });
  });
});
