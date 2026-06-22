import { expect, test } from '../../playwright';
import { closeAllCollections, createRequest, selectRequestPaneTab } from '../utils/page';
import {
  modifier,
  openKeybindingsTab,
  openRequest,
  pressShortcut,
  resetKeybindings,
  setupBoundActionsData
} from './helpers';

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor(); ;
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await resetKeybindings(page);
    await closeAllCollections(page);
  });

  test.describe('REQUESTS', () => {
    test.describe('SHORTCUT: Send Request (Cmd/Ctrl+Enter)', () => {
      test('sends request when cursor is in JSON body editor', async ({ pageWithUserData: page }) => {
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
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"');

        // Cursor is still in the body CodeMirror - press Cmd/Ctrl+Enter to send
        await pressShortcut(page, modifier, 'Enter');

        // Verify a 200 response came back
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      });

      test('sends request when cursor is in response body editor', async ({ pageWithUserData: page }) => {
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
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"');

        // First send to populate response
        await pressShortcut(page, modifier, 'Enter');
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        // Focus cursor inside the response body CodeMirror
        const responseEditor = page.getByTestId('response-preview-container').locator('.CodeMirror').first();
        await responseEditor.waitFor({ state: 'visible', timeout: 5000 });
        await responseEditor.click();

        // Press Cmd/Ctrl+Enter again - should re-send the request
        await pressShortcut(page, modifier, 'Enter');

        // Verify a 200 response came back (no error, status stays/refreshes to 200)
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      });

      test('sends request when cursor is in pre-request Vars value editor', async ({ pageWithUserData: page }) => {
        await createRequest(page, 'cmd-enter-req-vars', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'cmd-enter-req-vars', { persist: true });

        // Open Vars tab - request Vars has a Pre Request section as the first table
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

        // Cursor is still in the value CodeMirror - press Cmd/Ctrl+Enter to send
        // (should NOT insert a newline; should fire sendRequest)
        await pressShortcut(page, modifier, 'Enter');

        // Verify a 200 response came back
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      });
    });

    test.describe('SHORTCUT: Send Request (customized Shift+Enter)', () => {
      test('sends request when cursor is in JSON body editor', async ({ pageWithUserData: page }) => {
        // Remap sendRequest to Shift+Enter
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sendRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-sendRequest').click();
        await expect(page.getByTestId('keybinding-input-sendRequest')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Shift', 'Enter');

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
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"');

        // Cursor is still in the body CodeMirror - press Shift+Enter (customized) to send
        await pressShortcut(page, 'Shift', 'Enter');

        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      });

      test('sends request when cursor is in response body editor', async ({ pageWithUserData: page }) => {
        // Remap sendRequest to Shift+Enter
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sendRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-sendRequest').click();
        await expect(page.getByTestId('keybinding-input-sendRequest')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Shift', 'Enter');

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
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"');

        // First send with Shift+Enter to populate response
        await pressShortcut(page, 'Shift', 'Enter');
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        // Focus cursor inside the response body CodeMirror
        const responseEditor = page.getByTestId('response-preview-container').locator('.CodeMirror').first();
        await responseEditor.waitFor({ state: 'visible', timeout: 5000 });
        await responseEditor.click();

        // Press Shift+Enter again - should re-send the request
        await pressShortcut(page, 'Shift', 'Enter');

        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      });

      test('sends request when cursor is in pre-request Vars value editor', async ({ pageWithUserData: page }) => {
        // Remap sendRequest to Shift+Enter
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sendRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-sendRequest').click();
        await expect(page.getByTestId('keybinding-input-sendRequest')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Shift', 'Enter');

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

        // Cursor is still in the value CodeMirror - press Shift+Enter (customized) to send
        await pressShortcut(page, 'Shift', 'Enter');

        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      });
    });

    test.describe('SHORTCUT: Change Orientation (Cmd/Ctrl+J)', () => {
      test('default Cmd/Ctrl+J change layout orientation', async ({ pageWithUserData: page }) => {
        await openRequest(page, 'kb-collection', 'req-5', { persist: true });

        // Press Cmd/Ctrl+J to change layout
        await pressShortcut(page, modifier, 'KeyJ');

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to horizontal layout');

        // Press Cmd/Ctrl+J to change layout
        await pressShortcut(page, modifier, 'KeyJ');

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to vertical layout');

        // Press Cmd/Ctrl+J to change layout
        await pressShortcut(page, modifier, 'KeyJ');

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to horizontal layout');
      });
    });

    test.describe('SHORTCUT: Change Orientation (customized Alt+Shift+Y)', () => {
      test('customized Alt+Shift+Y change layout orientation', async ({ pageWithUserData: page }) => {
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-changeLayout');
        await row.hover();
        await page.getByTestId('keybinding-edit-changeLayout').click();
        await expect(page.getByTestId('keybinding-input-changeLayout')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'Shift', 'KeyY');

        await openRequest(page, 'kb-collection', 'req-5', { persist: true });

        await pressShortcut(page, 'Alt', 'Shift', 'KeyY');

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to horizontal layout');

        // Press Alt+Shift+Y to change layout
        await pressShortcut(page, 'Alt', 'Shift', 'KeyY');

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to vertical layout');

        // Press Alt+Shift+Y to change layout
        await pressShortcut(page, 'Alt', 'Shift', 'KeyY');

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to horizontal layout');
      });
    });
  });
});
