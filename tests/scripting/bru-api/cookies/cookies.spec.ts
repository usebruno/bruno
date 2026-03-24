import { test } from '../../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../../utils/page';

test.describe.parallel('bru.cookies PropertyList API', () => {
  test('all cookie tests pass in developer mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'cookies-test', 'developer');

    await runCollection(page, 'cookies-test');

    await validateRunnerResults(page, {
      totalRequests: 6,
      passed: 34,
      failed: 0
    });
  });

  test('all cookie tests pass in safe mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'cookies-test', 'safe');

    await runCollection(page, 'cookies-test');

    await validateRunnerResults(page, {
      totalRequests: 6,
      passed: 34,
      failed: 0
    });
  });
});
