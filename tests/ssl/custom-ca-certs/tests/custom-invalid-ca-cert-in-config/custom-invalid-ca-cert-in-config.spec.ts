import { test } from '../../../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../../../utils/page';

test.describe.serial('custom invalid ca cert added to the config and NO default ca certs', () => {
  test('developer mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up developer mode
    await setSandboxMode(page, 'custom-ca-certs', 'developer');

    // Run the collection
    await runCollection(page, 'custom-ca-certs');

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
    await setSandboxMode(page, 'custom-ca-certs', 'safe');

    // Run the collection
    await runCollection(page, 'custom-ca-certs');

    // Validate test results
    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 0,
      failed: 1,
      skipped: 0
    });
  });
});