import { test } from '../../../../playwright';
import { setSandboxMode, runFolder, selectEnvironment, validateRunnerResults } from '../../../utils/page';

test.describe.serial('bru.getVarList() API', () => {
  test('all getVarList tests pass in developer mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'developer');
    await selectEnvironment(page, 'Local');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'bru', 'getVarList']);
    await validateRunnerResults(page, {
      totalRequests: 5,
      passed: 5,
      failed: 0
    });
  });

  test('all getVarList tests pass in safe mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'safe');
    await selectEnvironment(page, 'Local');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'bru', 'getVarList']);
    await validateRunnerResults(page, {
      totalRequests: 5,
      passed: 5,
      failed: 0
    });
  });
});
