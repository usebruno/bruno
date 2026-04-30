import * as path from 'path';
import { execSync } from 'child_process';
import { pathToFileURL } from 'url';
import { test } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';
import { startServers, stopServers, PAC_PORT, type TestServers } from '../pac/server';

/**
 * Helpers to configure macOS system-level PAC proxy via networksetup.
 * These modify the real OS proxy settings, so cleanup is critical.
 */
const NETWORK_SERVICE = 'Wi-Fi';

function enableSystemPac(pacUrl: string) {
  execSync(`networksetup -setautoproxyurl "${NETWORK_SERVICE}" "${pacUrl}"`);
}

function disableSystemPac() {
  execSync(`networksetup -setautoproxystate "${NETWORK_SERVICE}" off`);
}

test.describe('System Proxy with PAC', () => {
  test.skip(process.platform !== 'darwin', 'macOS-only: relies on `networksetup` to set OS-level PAC');

  let servers: TestServers;

  test.beforeAll(async () => {
    servers = await startServers();
  });

  test.afterAll(async () => {
    // Always revert OS proxy settings, even if tests fail
    try {
      disableSystemPac();
    } finally {
      if (servers) {
        await stopServers(servers);
      }
    }
  });

  /**
   * Verifies that system proxy mode honors OS-level PAC configuration.
   *
   * 1. Sets macOS system proxy to a PAC URL via networksetup
   * 2. Launches Bruno with proxy source = "inherit" (system proxy mode)
   * 3. The PAC file routes /proxied through the test proxy (which adds x-proxied header)
   *    and returns DIRECT for /direct
   * 4. Validates both paths worked correctly
   *
   * This tests the fix for: "System proxy mode ignores OS-level PAC"
   */
  test('resolves OS-level PAC URL in system proxy mode (HTTP PAC)', async ({ launchElectronApp }) => {
    const pacUrl = `http://localhost:${PAC_PORT}/test.pac`;
    enableSystemPac(pacUrl);

    const initUserDataPath = path.join(__dirname, 'init-user-data');
    const app = await launchElectronApp({ initUserDataPath });

    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await setSandboxMode(page, 'system-pac-proxy-test', 'developer');
    await runCollection(page, 'system-pac-proxy-test');
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0,
      skipped: 0
    });
  });

  test('resolves OS-level PAC URL in system proxy mode (file:// PAC)', async ({ launchElectronApp }) => {
    const pacUrl = pathToFileURL(path.join(__dirname, '..', 'pac', 'fixtures', 'pac-files', 'test.pac')).href;
    enableSystemPac(pacUrl);

    const initUserDataPath = path.join(__dirname, 'init-user-data');
    const app = await launchElectronApp({ initUserDataPath });

    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await setSandboxMode(page, 'system-pac-proxy-test', 'developer');
    await runCollection(page, 'system-pac-proxy-test');
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0,
      skipped: 0
    });
  });
});
