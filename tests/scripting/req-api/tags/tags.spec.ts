import { test } from '../../../../playwright';
import { setSandboxMode, runFolder, selectEnvironment, validateRunnerResults } from '../../../utils/page';

test.describe.serial('req tags inherited from folders', () => {
  test.beforeEach(() => test.setTimeout(2 * 60 * 1000));

  test('req tags carry the folder chain in developer mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'developer');
    await selectEnvironment(page, 'Prod');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'req', 'tags']);
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });
  });

  test('req tags carry the folder chain in safe mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'safe');
    await selectEnvironment(page, 'Prod');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'req', 'tags']);
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });
  });
});
