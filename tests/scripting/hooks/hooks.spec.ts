import { test } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';

test.describe.serial('Hooks feature', () => {
  test.describe('developer mode', () => {
    test('should execute basic hooks (beforeRequest, afterResponse, multiple, wildcard, async, unhook)', async ({ pageWithUserData: page }) => {
      test.setTimeout(2 * 60 * 1000);

      await setSandboxMode(page, 'basic_hooks', 'developer');
      await runCollection(page, 'basic_hooks');

      await validateRunnerResults(page, {
        totalRequests: 1,
        passed: 1,
        failed: 0,
        skipped: 0
      });
    });

    test('should execute collectionRunStart and collectionRunEnd hooks', async ({ pageWithUserData: page }) => {
      test.setTimeout(2 * 60 * 1000);

      await setSandboxMode(page, 'collection_run_hooks', 'developer');
      await runCollection(page, 'collection_run_hooks');

      await validateRunnerResults(page, {
        totalRequests: 2,
        passed: 2,
        failed: 0,
        skipped: 0
      });
    });
  });

  test.describe('safe mode', () => {
    test('should execute basic hooks (beforeRequest, afterResponse, multiple, wildcard, async, unhook)', async ({ pageWithUserData: page }) => {
      test.setTimeout(2 * 60 * 1000);

      await setSandboxMode(page, 'basic_hooks', 'safe');
      await runCollection(page, 'basic_hooks');

      await validateRunnerResults(page, {
        totalRequests: 1,
        passed: 1,
        failed: 0,
        skipped: 0
      });
    });

    test('should execute collectionRunStart and collectionRunEnd hooks', async ({ pageWithUserData: page }) => {
      test.setTimeout(2 * 60 * 1000);

      await setSandboxMode(page, 'collection_run_hooks', 'safe');
      await runCollection(page, 'collection_run_hooks');

      await validateRunnerResults(page, {
        totalRequests: 2,
        passed: 2,
        failed: 0,
        skipped: 0
      });
    });
  });
});
