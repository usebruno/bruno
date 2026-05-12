import { test } from '../../../../playwright';
import { setSandboxMode, runFolder, selectEnvironment, validateRunnerResults } from '../../../utils/page';

test.describe.serial('bru.environment API', () => {
  test('all environment tests pass in developer mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'developer');
    await selectEnvironment(page, 'Local');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'bru', 'environment']);
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });
  });

  test('all environment tests pass in safe mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'safe');
    await selectEnvironment(page, 'Local');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'bru', 'environment']);
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });
  });
});
