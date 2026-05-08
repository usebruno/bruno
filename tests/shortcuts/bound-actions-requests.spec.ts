import { test, expect, Page } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest as openRequestBase,
  closeAllCollections,
  createFolder,
  openCollection,
  selectRequestPaneTab
} from '../utils/page';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const collectionName = 'kb-collection';
const baseRequests = ['req-1', 'req-2', 'req-3', 'req-4', 'req-5', 'req-6', 'req-7', 'req-8', 'req-9'];

const setupBoundActionsData = async (page: Page, createTmpDir: (prefix: string) => Promise<string>) => {
  await closeAllCollections(page);
  const path = await createTmpDir('kb-collection-path');
  await createCollection(page, collectionName, path);

  await createFolder(page, 'kb-folder', collectionName, true);
  await createFolder(page, 'kb-draft-folder', collectionName, true);
  await createFolder(page, 'kb-terminal-folder', collectionName, true);
};

const checkIfRequestExists = async (page: Page, requestName: string) => {
  await openCollection(page, collectionName);
  const request = page.getByTestId('collections').locator('.collection-item-name').filter({ hasText: requestName }).first();
  return (await request.count()) > 0;
};

const openRequest = async (...args: Parameters<typeof openRequestBase>) => {
  const [page, targetCollectionName, requestName] = args;
  if (
    targetCollectionName === collectionName
    && baseRequests.includes(requestName)
    && !(await checkIfRequestExists(page, requestName))
  ) {
    await createRequest(page, requestName, targetCollectionName);
  }

  return openRequestBase(...args);
};

const openKeybindingsTab = async (page: Page) => {
  await page.getByRole('button', { name: 'Open Preferences' }).click();
  await page.getByRole('tab', { name: 'Keybindings' }).click();
  await expect(page.locator('.section-header').filter({ hasText: 'Keybindings' })).toBeVisible();
};

/**
 * Close the Preferences tab by clicking its close button.
 * Using the close button avoids depending on any keyboard shortcut that may
 * have just been reconfigured.
 */
const closePreferencesTab = async (page: Page) => {
  const prefTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
  await prefTab.hover();
  await prefTab.getByTestId('request-tab-close-icon').click({ force: true });
  await expect(prefTab).not.toBeVisible({ timeout: 8000 });
};

const closeTabByName = async (page: any, name: string | RegExp) => {
  const tab = page.locator('.request-tab').filter({ hasText: name });
  await tab.click();
  await tab.hover();
  await tab.getByTestId('request-tab-close-icon').click({ force: true });
  await expect(tab).not.toBeVisible({ timeout: 2000 });
};

const openFolderSettingsTab = async (page: Page, folderName: string) => {
  await openCollection(page, collectionName);
  const folderRow = page.locator('.collection-item-name').filter({ hasText: folderName }).first();
  await expect(folderRow).toBeVisible({ timeout: 5000 });
  await folderRow.dblclick();
  await expect(page.locator('.request-tab').filter({ hasText: folderName })).toBeVisible({ timeout: 3000 });
};

const reopenClosedTab = async (page: Page, shortcut: () => Promise<void>, expectedTabName: string | RegExp) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('.request-tab').first().click();
    await page.waitForTimeout(150);
    await shortcut();
    const reopenedTab = page.locator('.request-tab').filter({ hasText: expectedTabName });
    if ((await reopenedTab.count()) > 0) {
      await expect(reopenedTab).toBeVisible({ timeout: 3000 });
      return;
    }
    await page.waitForTimeout(200);
  }

  await expect(page.locator('.request-tab').filter({ hasText: expectedTabName })).toBeVisible({ timeout: 5000 });
};

const remapKeybinding = async (
  page: Page,
  action: string,
  pressShortcut: () => Promise<void>
) => {
  await openKeybindingsTab(page);
  const row = page.getByTestId(`keybinding-row-${action}`);
  await expect(row).toBeVisible({ timeout: 5000 });
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  const editButton = row.getByTestId(`keybinding-edit-${action}`);
  const keybindingInput = page.getByTestId(`keybinding-input-${action}`);

  if (await editButton.isVisible().catch(() => false)) {
    await editButton.click({ force: true });
  } else {
    await row.click({ force: true });
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click({ force: true });
    }
  }

  await expect(keybindingInput).toBeVisible({ timeout: 5000 });

  await page.keyboard.press('Backspace');
  await pressShortcut();
  await closePreferencesTab(page);
};

const getTabIndex = async (page: Page, name: string) => {
  const tabs = page.locator('.request-tab .tab-label');
  const count = await tabs.count();
  for (let i = 0; i < count; i++) {
    const text = (await tabs.nth(i).innerText()).trim();
    if (text.includes(name)) {
      return i;
    }
  }

  return -1;
};

// ─── Tests ────

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 5000 });
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test.describe('REQUESTS', () => {
    test.describe('SHORTCUT: Send Request from CodeEditor (Cmd/Ctrl+Enter)', () => {
      test('sends request when cursor is in JSON body editor', async ({ page }) => {
        // Close existing tabs
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Create a POST request in the shared collection pointing to the echo server
        await createRequest(page, 'cmd-enter-req-body', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'cmd-enter-req-body', { persist: true });

        // Open Body tab and select JSON mode
        await selectRequestPaneTab(page, 'Body');
        await page.getByTestId('request-body-mode-selector').click();
        await page.locator('.dropdown-item').filter({ hasText: /^JSON$/ }).click();

        // Focus the body code editor and type JSON
        const bodyEditor = page.getByTestId('request-body-editor').locator('.CodeMirror');
        await bodyEditor.click();
        await page.keyboard.type('{"name": "Bruno", "version": 2, "tags": ["api", "client", "http"], "active": true, "meta": {"author": "user", "created": "2025-01-01", "updated": "2025-06-01"}, "counts": {"requests": 42, "collections": 7}}');
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"', { timeout: 5000 });

        // Cursor is still in the body CodeMirror — press Cmd/Ctrl+Enter to send
        await page.keyboard.press(`${modifier}+Enter`);

        // Verify a 200 response came back
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      });

      test('sends request when cursor is in response body editor', async ({ page }) => {
        // Close existing tabs
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await createRequest(page, 'cmd-enter-req-resp', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'cmd-enter-req-resp', { persist: true });

        await selectRequestPaneTab(page, 'Body');
        await page.getByTestId('request-body-mode-selector').click();
        await page.locator('.dropdown-item').filter({ hasText: /^JSON$/ }).click();

        const bodyEditor = page.getByTestId('request-body-editor').locator('.CodeMirror');
        await bodyEditor.click();
        await page.keyboard.type('{"name": "Bruno", "version": 2, "tags": ["api", "client", "http"], "active": true, "meta": {"author": "user", "created": "2025-01-01", "updated": "2025-06-01"}, "counts": {"requests": 42, "collections": 7}}');
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"', { timeout: 5000 });

        // First send to populate response
        await page.keyboard.press(`${modifier}+Enter`);
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        // Focus cursor inside the response body CodeMirror
        const responseEditor = page.getByTestId('response-preview-container').locator('.CodeMirror').first();
        await responseEditor.waitFor({ state: 'visible', timeout: 5000 });
        await responseEditor.click();

        // Press Cmd/Ctrl+Enter again — should re-send the request
        await page.keyboard.press(`${modifier}+Enter`);

        // Verify a 200 response came back (no error, status stays/refreshes to 200)
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      });

      test('sends request when cursor is in pre-request Vars value editor', async ({ page }) => {
        // Close existing tabs
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await createRequest(page, 'cmd-enter-req-vars', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'cmd-enter-req-vars', { persist: true });

        // Open Vars tab — request Vars has a Pre Request section as the first table
        await selectRequestPaneTab(page, 'Vars');

        // Fill the first var row: name=var-1
        const varsTable = page.getByTestId('request-pane').locator('table').first();
        const firstRow = varsTable.locator('tbody tr').first();
        const nameInput = firstRow.locator('input[type="text"]').first();
        await nameInput.click();
        await nameInput.fill('var-1');

        // Click the value CodeMirror editor and type a multi-line value
        const valueEditor = firstRow.locator('.CodeMirror').first();
        await valueEditor.click();
        await page.keyboard.type('val-1');
        await page.keyboard.press('Enter'); // insert newline in value editor
        await page.keyboard.type('val-2');

        // Cursor is still in the value CodeMirror — press Cmd/Ctrl+Enter to send
        // (should NOT insert a newline; should fire sendRequest)
        await page.keyboard.press(`${modifier}+Enter`);

        // Verify a 200 response came back
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      });
    });

    test.describe('SHORTCUT: Send Request from CodeEditor (customized Shift+Enter)', () => {
      test('customized Shift+Enter sends request when cursor is in JSON body editor', async ({ page }) => {
        // Close existing tabs
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap sendRequest to Shift+Enter
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sendRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-sendRequest').click();
        await expect(page.getByTestId('keybinding-input-sendRequest')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Shift');
        await page.keyboard.down('Enter');
        await page.keyboard.up('Enter');
        await page.keyboard.up('Shift');

        // await closePreferencesTab(page);
        // Create a POST request in the shared collection pointing to the echo server
        await createRequest(page, 'shift-enter-req-body', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'shift-enter-req-body', { persist: true });

        // Open Body tab and select JSON mode
        await selectRequestPaneTab(page, 'Body');
        await page.getByTestId('request-body-mode-selector').click();
        await page.locator('.dropdown-item').filter({ hasText: /^JSON$/ }).click();

        const bodyEditor = page.getByTestId('request-body-editor').locator('.CodeMirror');
        await bodyEditor.click();
        await page.keyboard.type('{"name": "Bruno", "version": 2, "tags": ["api", "client", "http"], "active": true, "meta": {"author": "user", "created": "2025-01-01", "updated": "2025-06-01"}, "counts": {"requests": 42, "collections": 7}}');
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"', { timeout: 5000 });

        // Cursor is still in the body CodeMirror — press Shift+Enter (customized) to send
        await page.keyboard.press('Shift+Enter');

        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        // Reset Default
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });

      test('customized Shift+Enter sends request when cursor is in response body editor', async ({ page }) => {
        // Close existing tabs
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap sendRequest to Shift+Enter
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sendRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-sendRequest').click();
        await expect(page.getByTestId('keybinding-input-sendRequest')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Shift');
        await page.keyboard.down('Enter');
        await page.keyboard.up('Enter');
        await page.keyboard.up('Shift');

        // await closePreferencesTab(page);
        await createRequest(page, 'shift-enter-req-resp', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'shift-enter-req-resp', { persist: true });

        await selectRequestPaneTab(page, 'Body');
        await page.getByTestId('request-body-mode-selector').click();
        await page.locator('.dropdown-item').filter({ hasText: /^JSON$/ }).click();

        const bodyEditor = page.getByTestId('request-body-editor').locator('.CodeMirror');
        await bodyEditor.click();
        await page.keyboard.type('{"name": "Bruno", "version": 2, "tags": ["api", "client", "http"], "active": true, "meta": {"author": "user", "created": "2025-01-01", "updated": "2025-06-01"}, "counts": {"requests": 42, "collections": 7}}');
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"', { timeout: 5000 });

        // First send with Shift+Enter to populate response
        await page.keyboard.press('Shift+Enter');
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        // Focus cursor inside the response body CodeMirror
        const responseEditor = page.getByTestId('response-preview-container').locator('.CodeMirror').first();
        await responseEditor.waitFor({ state: 'visible', timeout: 5000 });
        await responseEditor.click();

        // Press Shift+Enter again — should re-send the request
        await page.keyboard.press('Shift+Enter');

        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        // Reset Default
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });

      test('customized Shift+Enter sends request when cursor is in pre-request Vars value editor', async ({ page }) => {
        // Close existing tabs
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap sendRequest to Shift+Enter
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sendRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-sendRequest').click();
        await expect(page.getByTestId('keybinding-input-sendRequest')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Shift');
        await page.keyboard.down('Enter');
        await page.keyboard.up('Enter');
        await page.keyboard.up('Shift');

        // await closePreferencesTab(page);
        await createRequest(page, 'shift-enter-req-vars', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'shift-enter-req-vars', { persist: true });

        await selectRequestPaneTab(page, 'Vars');

        const varsTable = page.getByTestId('request-pane').locator('table').first();
        const firstRow = varsTable.locator('tbody tr').first();
        const nameInput = firstRow.locator('input[type="text"]').first();
        await nameInput.click();
        await nameInput.fill('var-1');

        const valueEditor = firstRow.locator('.CodeMirror').first();
        await valueEditor.click();
        await page.keyboard.type('val-1');
        await page.keyboard.press('Enter'); // insert newline in value editor
        await page.keyboard.type('val-2');

        // Cursor is still in the value CodeMirror — press Shift+Enter (customized) to send
        await page.keyboard.press('Shift+Enter');

        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        // Reset Default
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });
    });
  });
});
