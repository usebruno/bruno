import * as path from 'path';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';
import { test } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';
import { startServers, stopServers, PAC_PORT, type TestServers } from '../pac/server';

// GNOME's system-wide proxy schema — provided by gsettings-desktop-schemas.
// Writes need an active dbus session (see CI workflow's dbus-run-session wrapper).
const GNOME_PROXY_SCHEMA = 'org.gnome.system.proxy';

function enableSystemPac(pacUrl: string) {
  // Set URL first, then flip mode — otherwise auto mode briefly has no URL
  execFileSync('gsettings', ['set', GNOME_PROXY_SCHEMA, 'autoconfig-url', pacUrl]);
  execFileSync('gsettings', ['set', GNOME_PROXY_SCHEMA, 'mode', 'auto']);
}

function disableSystemPac() {
  execFileSync('gsettings', ['reset', GNOME_PROXY_SCHEMA, 'mode']);
  execFileSync('gsettings', ['reset', GNOME_PROXY_SCHEMA, 'autoconfig-url']);
}

// Detects schema availability so we can skip cleanly on minimal images
// (e.g. containers without gsettings-desktop-schemas installed).
function gnomeProxySchemaAvailable(): boolean {
  try {
    execFileSync('gsettings', ['get', GNOME_PROXY_SCHEMA, 'mode'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

test.describe('System Proxy with PAC', () => {
  test.skip(
    process.platform !== 'linux',
    'Linux-only: relies on gsettings to set OS-level PAC'
  );

  test.skip(
    process.platform === 'linux' && !gnomeProxySchemaAvailable(),
    'Linux: skipping because the org.gnome.system.proxy GSettings schema is not available on this runner'
  );

  let servers: TestServers;

  test.beforeAll(async () => {
    servers = await startServers();
  });

  test.afterAll(async () => {
    // Revert OS proxy settings even if a test failed, so the runner is left clean.
    try {
      disableSystemPac();
    } finally {
      if (servers) {
        await stopServers(servers);
      }
    }
  });

  // Covers the common corporate setup: PAC hosted at an HTTP URL (e.g. WPAD).
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

  // Covers the local-file PAC case (user-selected .pac file on disk).
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
