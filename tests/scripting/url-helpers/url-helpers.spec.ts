import { test } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';

test.describe.serial('URL helper methods', () => {
  test.describe('req.getHost(), req.getPath(), req.getQueryString(), req.getPathParams()', () => {
    test('should work in developer mode', async ({ pageWithUserData: page }) => {
      // Set up developer mode
      await setSandboxMode(page, 'url_helpers_test', 'developer');

      // Run the collection
      await runCollection(page, 'url_helpers_test');

      // Validate test results - 1 request should pass (with 4 assertions inside)
      await validateRunnerResults(page, {
        totalRequests: 1,
        passed: 1,
        failed: 0,
        skipped: 0
      });
    });

    test('should work in safe mode', async ({ pageWithUserData: page }) => {
      // Set up safe mode
      await setSandboxMode(page, 'url_helpers_test', 'safe');

      // Run the collection
      await runCollection(page, 'url_helpers_test');

      // Validate test results - 1 request should pass in safe mode too (with 4 assertions inside)
      await validateRunnerResults(page, {
        totalRequests: 1,
        passed: 1,
        failed: 0,
        skipped: 0
      });
    });
  });
});
