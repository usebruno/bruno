import * as http from 'http';
import { test, expect } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';

let server: http.Server;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/fast') {
      res.end('ok');
      return;
    }
    if (req.url === '/slow2s') {
      setTimeout(() => res.end('slow-ok'), 2000);
      return;
    }
    if (req.url === '/huge') {
      res.setHeader('content-type', 'text/plain');
      res.end('WAR AND PEACE '.repeat(Math.ceil((3 * 1024 * 1024) / 14)));
      return;
    }
    res.statusCode = 404;
    res.end('not found');
  });
  await new Promise<void>((resolve) => server.listen(18367, resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

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
        totalRequests: 6,
        passed: 6,
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
        totalRequests: 6,
        passed: 6,
        failed: 0,
        skipped: 0
      });
    });
  });
});
