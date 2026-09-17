import { test } from '../../../../playwright';
import { setSandboxMode, runFolder, selectEnvironment, validateRunnerResults } from '../../../utils/page';

test.describe.serial('req.headerList PropertyList API', () => {
  // A folder run of remote requests can take well over the 30s default; runFolder
  // itself waits up to 2 minutes for completion, so give the test the same budget.
  test.beforeEach(() => test.setTimeout(2 * 60 * 1000));

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
