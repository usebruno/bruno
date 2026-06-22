import { test, expect } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  selectRequestPaneTab,
  setAppCode,
  enableApp,
  exitApp,
  selectViewMode,
  saveRequest,
  closeAllTabs
} from '../utils/page';

const SIMPLE_APP = `<div id="hello">Hello from the app</div>`;

// Read the app code currently loaded in the App-tab editor (via the CodeMirror API).
const readAppEditor = (page) =>
  page
    .getByTestId('app-code-editor')
    .locator('.CodeMirror')
    .first()
    .evaluate((el) => (el as any).CodeMirror?.getValue());

test.describe('Apps - request-level UI', () => {
  test('App tab: enable takes over the panes, exit returns to the editor', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ui-toggle');
    await createCollection(page, 'apps-ui', collectionPath);
    await createRequest(page, 'app-req', 'apps-ui', {
      url: 'http://localhost:8081/api/echo/anything/x',
      method: 'GET'
    });
    await openRequest(page, 'apps-ui', 'app-req', { persist: true });

    await test.step('App tab exposes the toggle and editor', async () => {
      await selectRequestPaneTab(page, 'App');
      await expect(page.getByTestId('app-enable-toggle')).toBeVisible();
      await expect(page.getByTestId('app-code-editor')).toBeVisible();
      // request pane is still the normal request view while disabled
      await expect(page.getByTestId('request-pane')).toBeVisible();
    });

    await setAppCode(page, SIMPLE_APP);

    await test.step('Enabling app mode replaces the request/response area with the app view', async () => {
      await enableApp(page);
      await expect(page.getByTestId('app-view').locator('webview')).toBeVisible();
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

    await selectRequestPaneTab(page, 'App');
    // No code yet → no indicator
    await expect(page.getByTestId('responsive-tab-app').getByTestId('status-dot-app')).toHaveCount(0);

    await setAppCode(page, SIMPLE_APP);
    await expect(page.getByTestId('responsive-tab-app').getByTestId('status-dot-app')).toBeVisible();
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
      await expect(page.getByTestId('app-view').locator('webview')).toBeVisible();
    });

    await test.step('Switch to File mode (app view goes away)', async () => {
      await selectViewMode(page, 'file');
      await expect(page.getByTestId('view-mode-file')).toHaveClass(/active/);
      await expect(page.getByTestId('app-view')).toBeHidden();
    });

    await test.step('Switch back to Request mode', async () => {
      await selectViewMode(page, 'request');
      await expect(page.getByTestId('view-mode-request')).toHaveClass(/active/);
      await expect(page.getByTestId('request-pane')).toBeVisible();
    });
  });

  test('App code persists across save + reopen', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ui-persist');
    await createCollection(page, 'apps-persist', collectionPath);
    await createRequest(page, 'persist-req', 'apps-persist', { url: 'http://localhost:8081/api/echo/anything/x' });
    await openRequest(page, 'apps-persist', 'persist-req', { persist: true });

    await setAppCode(page, SIMPLE_APP);
    await saveRequest(page);

    await closeAllTabs(page);

    await openRequest(page, 'apps-persist', 'persist-req', { persist: true });
    await selectRequestPaneTab(page, 'App');
    await expect(page.getByTestId('app-code-editor')).toBeVisible();
    await expect.poll(() => readAppEditor(page)).toBe(SIMPLE_APP);
    // App mode starts disabled on reopen (enabled is runtime-only, not persisted)
    await expect(page.getByTestId('app-enable-toggle')).toBeVisible();
  });
});
