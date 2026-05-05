import { test } from '../../../../playwright';
import { setSandboxMode, runFolder, selectEnvironment, validateRunnerResults } from '../../../utils/page';

test.describe.serial('req.headerList PropertyList API', () => {
  test('all req.headerList tests pass in developer mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'developer');
    await selectEnvironment(page, 'Prod');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'req', 'headerList']);
    await validateRunnerResults(page, {
      totalRequests: 13,
      passed: 13,
      failed: 0
    });
  });

  test('all req.headerList tests pass in safe mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'safe');
    await selectEnvironment(page, 'Prod');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'req', 'headerList']);
    await validateRunnerResults(page, {
      totalRequests: 13,
      passed: 13,
      failed: 0
    });
  });
});
