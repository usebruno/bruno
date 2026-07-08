import { test, expect } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  selectRequestPaneTab,
  setAppCode,
  setAppEnabled,
  readAppEditor,
  requestPaneAppTab,
  openRequestPaneTabOverflow,
  requestPaneOverflowTabItem,
  activeAppView,
  previewApp,
  exitApp,
  selectViewMode,
  saveRequest,
  closeAllTabs
} from '../utils/page';

const SIMPLE_APP = `<div id="hello">Hello from the app</div>`;

// Assert the App tab is absent from the request pane — checks both the visible
// tab row and the ResponsiveTabs overflow dropdown (tabs can overflow at narrow widths).
const expectNoAppTab = async (page) => {
  await expect(requestPaneAppTab(page)).toHaveCount(0);
  await openRequestPaneTabOverflow(page);
  await expect(requestPaneOverflowTabItem(page, /^App$/)).toHaveCount(0);
  await page.keyboard.press('Escape');
};

test.describe('Apps - request-level UI', () => {
  test('App tab and view-mode toggle are gated behind the Enable App setting', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ui-gating');
    const collectionName = 'apps-gate';
    await createCollection(page, collectionName, collectionPath);
    await createRequest(page, 'gate-req', collectionName, {
      url: 'http://localhost:8081/api/echo/anything/x',
      method: 'GET'
    });
    await openRequest(page, collectionName, 'gate-req', { persist: true });

    await test.step('App tab and view-mode toggle are hidden by default', async () => {
      await expect(page.getByTestId('responsive-tab-params')).toBeVisible();
      await expectNoAppTab(page);
      await expect(page.getByTestId('view-mode-toggle')).toHaveCount(0);
    });

    await setAppEnabled(page, true);

    await test.step('Enabling in settings reveals the App tab and view-mode toggle', async () => {
      await expect(page.getByTestId('view-mode-toggle')).toBeVisible();
      // selecting the tab proves it exists (handles the overflow dropdown too)
      await selectRequestPaneTab(page, 'App');
      await expect(page.getByTestId('app-code-editor')).toBeVisible();
    });

    await setAppEnabled(page, false);

    await test.step('Disabling hides them again', async () => {
      await expectNoAppTab(page);
      await expect(page.getByTestId('view-mode-toggle')).toHaveCount(0);
    });
  });

  test('App tab: Preview takes over the panes, exit returns to the editor', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ui-toggle');
    await createCollection(page, 'apps-ui', collectionPath);
    await createRequest(page, 'app-req', 'apps-ui', {
      url: 'http://localhost:8081/api/echo/anything/x',
      method: 'GET'
    });
    await openRequest(page, 'apps-ui', 'app-req', { persist: true });

    await setAppCode(page, SIMPLE_APP);

    await test.step('App tab exposes the Preview button and editor', async () => {
      await expect(page.getByTestId('app-preview-btn')).toBeVisible();
      await expect(page.getByTestId('app-code-editor')).toBeVisible();
      // request pane is still the normal request view before previewing
      await expect(page.getByTestId('request-pane')).toBeVisible();
    });

    await test.step('Preview replaces the request/response area with the app view', async () => {
      await previewApp(page);
      await expect(activeAppView(page).locator('webview')).toBeVisible();
      await expect(page.getByTestId('request-pane')).toBeHidden();
    });

    await test.step('Exit returns to the request pane / App editor', async () => {
      await exitApp(page);
      await selectRequestPaneTab(page, 'App');
      await expect(page.getByTestId('app-code-editor')).toBeVisible();
    });
  });

  test('App tab shows a status-dot indicator once code is present', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ui-indicator');
    await createCollection(page, 'apps-ind', collectionPath);
    await createRequest(page, 'ind-req', 'apps-ind', { url: 'http://localhost:8081/api/echo/anything/x' });
    await openRequest(page, 'apps-ind', 'ind-req', { persist: true });

    await setAppEnabled(page, true);
    await selectRequestPaneTab(page, 'App');
    // No code yet → no indicator
    await expect(requestPaneAppTab(page).getByTestId('status-dot-app')).toHaveCount(0);

    await setAppCode(page, SIMPLE_APP);
    await expect(requestPaneAppTab(page).getByTestId('status-dot-app')).toBeVisible();
  });

  test('Collection toolbar view-mode toggle switches Request / App / File', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ui-viewmode');
    await createCollection(page, 'apps-mode', collectionPath);
    await createRequest(page, 'mode-req', 'apps-mode', { url: 'http://localhost:8081/api/echo/anything/x' });
    await openRequest(page, 'apps-mode', 'mode-req', { persist: true });
    await setAppCode(page, SIMPLE_APP);

    await test.step('Request mode is active by default', async () => {
      await expect(page.getByTestId('view-mode-request')).toHaveClass(/active/);
      await expect(page.getByTestId('request-pane')).toBeVisible();
    });

    await test.step('Switch to App mode', async () => {
      await selectViewMode(page, 'app');
      await expect(page.getByTestId('view-mode-app')).toHaveClass(/active/);
      await expect(activeAppView(page).locator('webview')).toBeVisible();
    });

    await test.step('Switch to File mode (app view goes away)', async () => {
      await selectViewMode(page, 'file');
      await expect(page.getByTestId('view-mode-file')).toHaveClass(/active/);
      await expect(activeAppView(page)).toHaveCount(0);
    });

    await test.step('Switch back to Request mode', async () => {
      await selectViewMode(page, 'request');
      await expect(page.getByTestId('view-mode-request')).toHaveClass(/active/);
      await expect(page.getByTestId('request-pane')).toBeVisible();
    });
  });

  test('Enable App and code persist; an enabled app opens in preview mode by default', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ui-persist');
    await createCollection(page, 'apps-persist', collectionPath);
    await createRequest(page, 'persist-req', 'apps-persist', { url: 'http://localhost:8081/api/echo/anything/x' });
    await openRequest(page, 'apps-persist', 'persist-req', { persist: true });

    // Enabling from Settings keeps the tab in request mode so code can be written.
    await setAppCode(page, SIMPLE_APP);
    await expect(page.getByTestId('request-pane')).toBeVisible();
    await saveRequest(page);

    await closeAllTabs(page);

    await openRequest(page, 'apps-persist', 'persist-req', { persist: true });

    await test.step('Freshly opened app-enabled request starts in preview mode', async () => {
      await expect(activeAppView(page).locator('webview')).toBeVisible();
      await expect(page.getByTestId('view-mode-app')).toHaveClass(/active/);
    });

    await test.step('App code survives the round-trip', async () => {
      await exitApp(page);
      await selectRequestPaneTab(page, 'App');
      await expect(page.getByTestId('app-code-editor')).toBeVisible();
      await expect.poll(() => readAppEditor(page)).toBe(SIMPLE_APP);
    });
  });
});
