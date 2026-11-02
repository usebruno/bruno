import { test } from '@e2e/test';
import {
  setSandboxMode,
  runFolder,
  selectEnvironment,
  validateRunnerResults
} from '@e2e/pages';

test.describe.serial('res.headerList PropertyList API', () => {
  // A folder run of remote requests can take well over the 30s default; runFolder
  // itself waits up to 2 minutes for completion, so give the test the same budget.
  test.beforeEach(() => test.setTimeout(2 * 60 * 1000));

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
