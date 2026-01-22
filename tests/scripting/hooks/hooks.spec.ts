import { test } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';

test.describe.serial('Hooks feature', () => {
  test.describe('developer mode', () => {
    test('should execute all hooks comprehensively', async ({ pageWithUserData: page }) => {
      test.setTimeout(5 * 60 * 1000);

      await setSandboxMode(page, 'hooks-comprehensive-tests', 'developer');
      await runCollection(page, 'hooks-comprehensive-tests');

      await validateRunnerResults(page, {
        totalRequests: 45,
        passed: 45,
        failed: 0,
        skipped: 0
      });
    });
  });

  test.describe('safe mode', () => {
    test('should execute all hooks comprehensively', async ({ pageWithUserData: page }) => {
      test.setTimeout(5 * 60 * 1000);

      await setSandboxMode(page, 'hooks-comprehensive-tests', 'safe');
      await runCollection(page, 'hooks-comprehensive-tests');

      await validateRunnerResults(page, {
        totalRequests: 45,
        passed: 45,
        failed: 0,
        skipped: 0
      });
    });
  });
});
