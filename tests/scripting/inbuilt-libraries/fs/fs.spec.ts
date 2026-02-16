import { test } from '../../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../../utils/page';

test.describe.serial('`fs` library', () => {
  test('developer mode allows fs', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up developer mode
    await setSandboxMode(page, 'should_allow_fs', 'developer');

    // Run the collection
    await runCollection(page, 'should_allow_fs');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 1,
      failed: 0,
      skipped: 0
    });
  });

  test('safe mode blocks fs', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up safe mode
    await setSandboxMode(page, 'should_allow_fs', 'safe');

    // Run the collection
    await runCollection(page, 'should_allow_fs');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 0,
      failed: 1,
      skipped: 0
    });
  });
});
