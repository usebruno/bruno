import * as path from 'path';
import { pathToFileURL } from 'url';
import { test } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';
import { startServers, stopServers, type TestServers } from './server';

test.describe('PAC Proxy', () => {
  test.setTimeout(60_000);

  let servers: TestServers;

  test.beforeAll(async () => {
    servers = await startServers();
  });

  test.afterAll(async () => {
    if (servers) {
      await stopServers(servers);
    }
  });

  /**
   * Verifies end-to-end PAC proxy resolution:
   *
   * - The PAC file routes /proxied paths to the local test proxy (port 18888).
   * - The local test proxy injects `x-proxied: test-proxy` into every response.
   * - /direct paths are returned DIRECT — no proxy header added.
   *
   * Both assertions live inside the collection's `tests {}` blocks, so
   * validateRunnerResults confirms the full flow passed.
   */
  test('routes requests per PAC directive (PROXY and DIRECT)', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, 'pac-proxy-test', 'developer');
    await runCollection(page, 'pac-proxy-test');
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0,
      skipped: 0
    });
  });

  test('routes requests via file:// PAC URL', async ({ launchElectronApp }) => {
    // Compute the file:// URL at runtime so it is correct on every OS:
    //   Mac/Linux → file:///abs/path/to/test.pac
    //   Windows   → file:///C:/abs/path/to/test.pac
    const pacFilePath = path.join(__dirname, 'fixtures', 'pac-files', 'test.pac');
    const pacFileUrl = pathToFileURL(pacFilePath).href;

    const initUserDataPath = path.join(__dirname, 'init-user-data-file');
    const app = await launchElectronApp({
      initUserDataPath,
      templateVars: { pacFileUrl }
    });

    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await setSandboxMode(page, 'pac-proxy-test', 'developer');
    await runCollection(page, 'pac-proxy-test');
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0,
      skipped: 0
    });
  });
});
