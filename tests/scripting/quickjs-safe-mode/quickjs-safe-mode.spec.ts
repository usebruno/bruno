import { test, expect } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';

test.describe.serial('QuickJS safe mode teardown', () => {
  test('contains the engine trap, keeps the abort visible in the app output, and stays healthy on a second run', async ({
    pageWithUserData: page,
    reuseOrLaunchElectronApp
  }, testInfo) => {
    const app = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    let stderrText = '';
    app.process().stderr?.on('data', (chunk) => (stderrText += chunk));

    await test.step('first run passes: fire-and-forget wait, contained trap, sync vars, async tests', async () => {
      await setSandboxMode(page, 'quickjs-safe-mode', 'safe');
      await runCollection(page, 'quickjs-safe-mode');
      await validateRunnerResults(page, {
        totalRequests: 7,
        passed: 7,
        failed: 0,
        skipped: 0
      });
    });

    await test.step('the contained abort stays visible in the app process output', async () => {
      await expect.poll(() => stderrText).toContain('list_empty(&rt->gc_obj_list)');
      await expect.poll(() => stderrText).toContain('was replaced; the run was not affected');
    });

    await test.step('a second full run stays healthy after the trap', async () => {
      await runCollection(page, 'quickjs-safe-mode');
      await validateRunnerResults(page, {
        totalRequests: 7,
        passed: 7,
        failed: 0,
        skipped: 0
      });
    });
  });
});
