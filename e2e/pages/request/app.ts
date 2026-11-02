import { test, expect, Page, ElectronApplication } from '../../playwright';
import { buildItemActionLocators } from '../sidebar/item-actions';
import { buildSidebarLocators } from '../sidebar/collection-tree';
import { selectRequestPaneTab } from './pane';

const buildLocators = (page: Page) => ({
  actions: buildItemActionLocators(page),
  sidebar: buildSidebarLocators(page)
});

/**
 * Toggle the "Enable App" request setting idempotently (Settings tab).
 * Enabling exposes the App tab and the Request/App/File view-mode toggle.
 * @param page - The page object
 * @param enabled - Whether apps should be enabled for the request
 */
export const setAppEnabled = async (page: Page, enabled: boolean) => {
  await test.step(`Set Enable App ${enabled ? 'ON' : 'OFF'}`, async () => {
    await selectRequestPaneTab(page, 'Settings');
    const toggle = page.getByTestId('enable-app-toggle');
    await expect(toggle).toBeVisible();
    const current = (await toggle.getAttribute('aria-checked')) === 'true';
    if (current !== enabled) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', String(enabled));
    }
  });
};

/**
 * Set the request's app code. Enables apps in the request settings (the App
 * tab is hidden otherwise), opens the App tab and writes the editor value
 * directly via the CodeMirror API (avoids auto-close-bracket corruption when
 * typing HTML/JS char-by-char). The app view must not be active (editor visible).
 * @param page - The page object
 * @param code - The HTML/JS app code
 */
export const setAppCode = async (page: Page, code: string) => {
  await setAppEnabled(page, true);
  await test.step('Set app code', async () => {
    await selectRequestPaneTab(page, 'App');
    const editor = appCodeEditor(page);
    await editor.waitFor({ state: 'visible' });
    await editor.evaluate((el, val) => {
      const cm = (el as any).CodeMirror;
      if (cm) cm.setValue(val);
    }, code);
  });
};

/**
 * The CodeMirror element of the request-level App-tab editor.
 * @param page - The page object
 */
export const appCodeEditor = (page: Page) => page.getByTestId('app-code-editor').locator('.CodeMirror').first();

/**
 * Read the app code currently loaded in the App-tab editor (via the CodeMirror API).
 * @param page - The page object
 * @returns The editor's current value
 */
export const readAppEditor = (page: Page): Promise<string | undefined> =>
  appCodeEditor(page).evaluate((el) => (el as any).CodeMirror?.getValue());

/**
 * The App tab of the request pane tab bar.
 * @param page - The page object
 */
export const requestPaneAppTab = (page: Page) => page.getByTestId('responsive-tab-app');

/**
 * The keep-alive preview slot of the ACTIVE tab. The AppPreviewKeepAlive
 * overlay keeps app views of background tabs mounted (hidden) and the Electron
 * instance is shared across tests in a worker, so bare app-view lookups can
 * match a stale slot from another test. Always scope through the active slot.
 * @param page - The page object
 */
export const activeAppPreviewSlot = (page: Page) => page.locator('.app-preview-slot.active');

/**
 * The app view of the ACTIVE tab (see activeAppPreviewSlot).
 * @param page - The page object
 */
export const activeAppView = (page: Page) => activeAppPreviewSlot(page).getByTestId('app-view');

/**
 * The shared "No app yet" empty state, rendered by both the request-level app
 * view and the standalone collection app whenever the app has no code.
 * @param page - The page object
 */
export const appEmptyState = (page: Page) => activeAppPreviewSlot(page).getByTestId('empty-app-state');

/**
 * Open the app view via the App tab's "Preview" button. Asserts the app view
 * takes over the request/response area.
 * @param page - The page object
 */
export const previewApp = async (page: Page) => {
  await test.step('Preview app (App tab button)', async () => {
    await selectRequestPaneTab(page, 'App');
    await page.getByTestId('app-preview-btn').click();
    await expect(activeAppView(page)).toBeVisible({ timeout: 5000 });
  });
};

/**
 * Exit app mode via the app view's "Exit to editor" button.
 * @param page - The page object
 */
export const exitApp = async (page: Page) => {
  await test.step('Exit app mode', async () => {
    await activeAppView(page).getByTestId('app-exit-button').click();
    await expect(activeAppView(page)).toHaveCount(0, { timeout: 5000 });
  });
};

/**
 * Switch the active request's view mode using the collection toolbar toggle.
 * @param page - The page object
 * @param mode - 'request' | 'app' | 'file'
 */
export const selectViewMode = async (page: Page, mode: 'request' | 'app' | 'file') => {
  await test.step(`Switch view mode to "${mode}"`, async () => {
    await page.getByTestId(`view-mode-${mode}`).click();
  });
};

/**
 * The document URL of the active app's <webview>. Guest URLs are unique per
 * app, so this identifies one guest exactly — preferable to picking the newest
 * WebContents, which silently binds to a leftover guest from an earlier test in
 * the same worker. Throws if no webview attaches within the timeout; callers
 * polling for a guest should catch and retry.
 */
export const getAppWebviewSrc = async (page: Page): Promise<string> => {
  const webview = activeAppView(page).locator('webview');
  await webview.waitFor({ state: 'attached', timeout: 5000 });
  return (await webview.getAttribute('src')) || '';
};

/**
 * Evaluate `code` inside the active app's <webview> guest. The guest runs
 * out-of-process, so it is unreachable from the renderer page: the guest
 * WebContents is located in the Electron main process by the exact document
 * URL the active webview is showing, which identifies one guest even when
 * guests from earlier tests are still alive in the same worker.
 *
 * Returns undefined while the webview has not attached yet (it mounts only
 * after the document-registration IPC round-trip resolves), so expect.poll
 * callers can keep retrying instead of failing on a slow mount.
 */
export const evalInActiveAppGuest = async (page: Page, electronApp: ElectronApplication, code: string): Promise<unknown> => {
  let src: string;
  try {
    src = await getAppWebviewSrc(page);
  } catch {
    return undefined;
  }
  return electronApp.evaluate(
    async ({ webContents }, { src: wanted, code: c }) => {
      const guest = webContents.getAllWebContents().find((wc) => {
        try {
          return wc.getType() === 'webview' && wc.getURL() === wanted;
        } catch {
          return false;
        }
      });
      if (!guest) return undefined;
      return await guest.executeJavaScript(c, true);
    },
    { src, code }
  );
};

/**
 * Wait until the active app's guest has booted far enough that `window.bru.ctx`
 * exists — the injected bootstrap has run and the ctx bridge is usable.
 */
export const waitForAppGuestReady = async (page: Page, electronApp: ElectronApplication, options: { timeout?: number } = {}) => {
  await expect
    .poll(async () => evalInActiveAppGuest(page, electronApp, 'window.bru && typeof window.bru.ctx'), {
      timeout: options.timeout ?? 15000
    })
    .toBe('object');
};

/**
 * Create a standalone (collection-level or folder-level) app via the sidebar
 * context menu. Opens the new tab once created.
 * @param page - The page object
 * @param appName - Name to give the new app
 * @param parent - Either `{ collectionName }` for a collection-level app,
 *                 or `{ collectionName, folderName }` for a folder-level app.
 */
export const createApp = async (
  page: Page,
  appName: string,
  parent: { collectionName: string; folderName?: string }
) => {
  await test.step(`Create app "${appName}" in ${parent.folderName ? `folder "${parent.folderName}"` : `collection "${parent.collectionName}"`}`, async () => {
    const locators = buildLocators(page);

    if (parent.folderName) {
      const collectionScope = locators.sidebar.collectionScope(parent.collectionName);
      const folderRow = collectionScope.locator('.collection-item-name').filter({ hasText: parent.folderName });
      await folderRow.hover();
      await folderRow.locator('.menu-icon').click();
    } else {
      await locators.sidebar.collection(parent.collectionName).hover();
      const collectionAction = locators.actions.collectionActions(parent.collectionName);
      await expect(collectionAction).toBeVisible({ timeout: 2000 });
      await collectionAction.click();
    }

    await page.locator('.tippy-box:visible .dropdown-item').filter({ hasText: 'New App' }).click();

    const modal = page.locator('.bruno-modal').filter({ hasText: 'New App' });
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('input[name="appName"]').fill(appName);
    await modal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(modal).toBeHidden({ timeout: 5000 });
  });
};

/**
 * Switch the CollectionApp tab between Code and Preview views.
 * @param page - The page object
 * @param view - 'code' | 'preview'
 */
export const selectAppView = async (page: Page, view: 'code' | 'preview') => {
  await test.step(`Switch collection app to "${view}"`, async () => {
    // Scope through the active keep-alive slot — hidden slots of background
    // app tabs (possibly from earlier tests in the shared Electron) also
    // render this toggle.
    await activeAppPreviewSlot(page).getByTestId(`collection-app-view-${view}`).click();
  });
};

export const getAppWebviewHtml = async (page: Page, electronApp: ElectronApplication): Promise<string> => {
  await waitForAppGuestReady(page, electronApp);
  return (await evalInActiveAppGuest(page, electronApp, 'document.documentElement.outerHTML')) as string;
};
