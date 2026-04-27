import { test } from '../../../../playwright';
import { setSandboxMode, runFolder, selectEnvironment, validateRunnerResults } from '../../../utils/page';

test.describe.serial('res.headerList PropertyList API', () => {
  test('all res.headerList tests pass in developer mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'developer');
    await selectEnvironment(page, 'Prod');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'res', 'headerList']);
    await validateRunnerResults(page, {
      totalRequests: 5,
      passed: 5,
      failed: 0
    });
  });

  test('all res.headerList tests pass in safe mode', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'bruno-testbench', 'safe');
    await selectEnvironment(page, 'Prod');
    await runFolder(page, 'bruno-testbench', ['scripting', 'api', 'res', 'headerList']);
    await validateRunnerResults(page, {
      totalRequests: 5,
      passed: 5,
      failed: 0
    });
  });
});
