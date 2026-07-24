import { test } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';

test.describe('additionalContextRoots npm resolution [developer mode]', () => {
  test('Collection A resolves shared-lib via walk-up', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    await setSandboxMode(page, 'Collection A', 'developer');
    await runCollection(page, 'Collection A');

    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0,
      skipped: 0
    });
  });

  test('Collection B reuses the same shared root from the workspace', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    await setSandboxMode(page, 'Collection B', 'developer');
    await runCollection(page, 'Collection B');

    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 1,
      failed: 0,
      skipped: 0
    });
  });
});
