import { test } from '../../../../playwright';
import { setSandboxMode, runFolder, selectEnvironment, validateRunnerResults } from '../../../utils/page';

test.describe.serial('bru.globals API', () => {
  test('all globals tests pass in developer mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'developer');
    await selectEnvironment(page, 'Local');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'bru', 'globals']);
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });
  });

  test('all globals tests pass in safe mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'safe');
    await selectEnvironment(page, 'Local');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'bru', 'globals']);
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });
  });
});
