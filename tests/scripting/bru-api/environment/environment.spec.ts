import { test } from '../../../../playwright';
import { setSandboxMode, runFolder, selectEnvironment, validateRunnerResults } from '../../../utils/page';

test.describe.serial('bru.environment PropertyList API', () => {
  test('all environment tests pass in developer mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'developer');
    await selectEnvironment(page, 'Local');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'bru', 'environment']);
    await validateRunnerResults(page, {
      totalRequests: 4,
      passed: 4,
      failed: 0
    });
  });

  test('all environment tests pass in safe mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'safe');
    await selectEnvironment(page, 'Local');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'bru', 'environment']);
    await validateRunnerResults(page, {
      totalRequests: 4,
      passed: 4,
      failed: 0
    });
  });
});
