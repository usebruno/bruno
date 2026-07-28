import * as fs from 'fs';
import * as path from 'path';
import { test, expect, Page } from '../../../playwright';
import { buildGrpcCommonLocators } from '../../utils/page/locators';
import { waitForReadyPage } from '../../utils/page';

const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

/**
 * TlsIndicator lives inside the URL bar for both HTTP and gRPC requests. It's a
 * global toggle bound to preferences.request.sslVerification:
 *   - enabled  → IconLock (opacity 1)      SSL/TLS verification ON
 *   - disabled → IconLockOpen (opacity 0.55) SSL/TLS verification OFF
 *
 * The gRPC integration flows through `resolveGrpcUseTls` — grpcs://... URLs
 * follow the toggle, grpc://... and loopback bare hosts stay plaintext. The
 * tests below cover the UI contract and the request-execution wiring using
 * the local testbench (packages/bruno-tests/src/grpc, ports 50051 / 50052).
 *
 * Each test launches its own Electron instance with a fresh copy of the
 * fixture collection so tests can run in parallel — the sslVerification
 * toggle is a global preference, so a shared app would let one test's toggle
 * leak into another's assertions. `launchElectronApp` is worker-scoped and
 * auto-closes apps at worker teardown, so we don't manage lifecycle here.
 */

type LaunchElectronApp = (opts?: {
  initUserDataPath?: string;
  templateVars?: Record<string, string>;
}) => Promise<import('@playwright/test').ElectronApplication>;

const launchFreshApp = async (
  launchElectronApp: LaunchElectronApp,
  createTmpDir: (tag?: string) => Promise<string>
): Promise<{ page: Page }> => {
  // Per-test collection copy — Ctrl/Cmd+S writes to .bru files, so a shared
  // source dir would race across parallel workers.
  const collectionSrc = path.join(__dirname, 'fixtures', 'collection');
  const collectionDir = await createTmpDir('tls-indicator-col');
  await fs.promises.cp(collectionSrc, collectionDir, { recursive: true });

  const app = await launchElectronApp({
    initUserDataPath: path.join(__dirname, 'init-user-data'),
    templateVars: { collectionPath: collectionDir.replace(/\\/g, '/') }
  });
  const page = await waitForReadyPage(app);
  return { page };
};

const openEchoService = async (page: Page) => {
  const locators = buildGrpcCommonLocators(page);
  await test.step('open TlsIndicatorTests collection', async () => {
    await locators.sidebar.collection('TlsIndicatorTests').click();
    await locators.sidebar.folder('EchoService').click();
  });
  return locators;
};

test.describe('TLS indicator on gRPC requests', () => {
  test('renders on the gRPC URL bar with the enabled (lock) state by default', async ({ launchElectronApp, createTmpDir }) => {
    const { page } = await launchFreshApp(launchElectronApp, createTmpDir);
    const locators = await openEchoService(page);
    await locators.sidebar.request('Ping-Insecure').click();

    await expect(locators.tlsIndicator.root()).toBeVisible();
    await expect(locators.tlsIndicator.enabledIcon()).toBeVisible();
    // Enabled icon renders at full opacity; disabled is dimmed to 0.55.
    await expect(locators.tlsIndicator.icon()).toHaveAttribute('style', /opacity:\s*1/);
  });

  test('clicking toggles between enabled (lock) and disabled (lock-open)', async ({ launchElectronApp, createTmpDir }) => {
    const { page } = await launchFreshApp(launchElectronApp, createTmpDir);
    const locators = await openEchoService(page);
    await locators.sidebar.request('Ping-Insecure').click();
    await expect(locators.tlsIndicator.enabledIcon()).toBeVisible();

    await test.step('click → disabled', async () => {
      await locators.tlsIndicator.root().click();
      await expect(locators.tlsIndicator.disabledIcon()).toBeVisible();
      await expect(locators.tlsIndicator.icon()).toHaveAttribute('style', /opacity:\s*0?\.55/);
    });

    await test.step('click again → enabled', async () => {
      await locators.tlsIndicator.root().click();
      await expect(locators.tlsIndicator.enabledIcon()).toBeVisible();
      await expect(locators.tlsIndicator.icon()).toHaveAttribute('style', /opacity:\s*1/);
    });
  });

  test('tooltip text reflects the current state', async ({ launchElectronApp, createTmpDir }) => {
    const { page } = await launchFreshApp(launchElectronApp, createTmpDir);
    const locators = await openEchoService(page);
    await locators.sidebar.request('Ping-Insecure').click();
    await expect(locators.tlsIndicator.enabledIcon()).toBeVisible();

    await test.step('enabled state tooltip mentions "enabled"', async () => {
      await locators.tlsIndicator.root().hover();
      await expect(locators.tlsIndicator.tooltip().filter({ hasText: /verification enabled/i }))
        .toBeVisible({ timeout: 3000 });
    });

    await test.step('disabled state tooltip mentions "disabled"', async () => {
      await locators.tlsIndicator.root().click();
      // Move away then re-hover so the tooltip re-renders with new content.
      await page.mouse.move(0, 0);
      await locators.tlsIndicator.root().hover();
      await expect(locators.tlsIndicator.tooltip().filter({ hasText: /verification disabled/i }))
        .toBeVisible({ timeout: 3000 });
    });
  });

  test('toggle state persists when switching between gRPC requests', async ({ launchElectronApp, createTmpDir }) => {
    const { page } = await launchFreshApp(launchElectronApp, createTmpDir);
    const locators = await openEchoService(page);
    await locators.sidebar.request('Ping-Insecure').click();
    await expect(locators.tlsIndicator.enabledIcon()).toBeVisible();

    await test.step('disable on Ping-Insecure', async () => {
      await locators.tlsIndicator.root().click();
      await expect(locators.tlsIndicator.disabledIcon()).toBeVisible();
    });

    await test.step('switch to Ping-TLS, indicator is still disabled', async () => {
      await locators.sidebar.request('Ping-TLS').click();
      await expect(locators.tlsIndicator.disabledIcon()).toBeVisible();
    });
  });

  test('sends Ping to grpc://localhost:50051 successfully regardless of indicator state', async ({ launchElectronApp, createTmpDir }) => {
    const { page } = await launchFreshApp(launchElectronApp, createTmpDir);
    const locators = await openEchoService(page);
    await locators.sidebar.request('Ping-Insecure').click();
    await expect(locators.tlsIndicator.enabledIcon()).toBeVisible();
    await expect(locators.request.queryUrlContainer().locator('.CodeMirror')).toBeVisible();

    await test.step('verification enabled → OK (plaintext URL is never TLS)', async () => {
      await locators.request.sendButton().click();
      await expect(locators.response.statusCode()).toBeVisible({ timeout: 10000 });
      await expect(locators.response.statusCode()).toHaveText(/^0$/);
      await expect(locators.response.statusText()).toHaveText(/OK/);
    });

    // Reflection can mark the request as modified; save to keep tab state clean
    // (mirrors the workaround in make-request.spec.ts).
    await page.keyboard.press(saveShortcut);

    await test.step('verification disabled → still OK', async () => {
      await locators.tlsIndicator.root().click();
      await expect(locators.tlsIndicator.disabledIcon()).toBeVisible();

      await locators.request.sendButton().click();
      await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 10000 });
      await expect(locators.response.statusText()).toHaveText(/OK/);
    });

    await page.keyboard.press(saveShortcut);
  });

  test('grpcs://localhost:50052 fails when verification is enabled (self-signed cert)', async ({ launchElectronApp, createTmpDir }) => {
    const { page } = await launchFreshApp(launchElectronApp, createTmpDir);
    const locators = await openEchoService(page);
    await locators.sidebar.request('Ping-TLS').click();
    await expect(locators.tlsIndicator.enabledIcon()).toBeVisible();
    await expect(locators.request.queryUrlContainer().locator('.CodeMirror')).toBeVisible();

    await test.step('send → non-zero status (server cert is self-signed)', async () => {
      await locators.request.sendButton().click();
      // grpc-js typically surfaces UNAVAILABLE (14) for TLS handshake failures.
      // We just assert the request didn't succeed — the exact code can vary
      // slightly across grpc-js versions, but 0/OK is the failure signal.
      await expect(locators.response.statusCode()).toBeVisible({ timeout: 15000 });
      await expect(locators.response.statusCode()).not.toHaveText(/^0$/);
      await expect(locators.response.statusText()).not.toHaveText(/^OK$/);
    });

    await page.keyboard.press(saveShortcut);
  });
});
