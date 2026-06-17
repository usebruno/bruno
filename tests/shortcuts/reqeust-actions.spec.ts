import { expect, test } from '../../playwright';
import { closeAllCollections, createRequest, selectRequestPaneTab } from '../utils/page';
import {
  modifier,
  openKeybindingsTab,
  openRequest,
  setupBoundActionsData
} from './helpers';

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 5000 });
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test.describe('REQUESTS', () => {
    test.describe('SHORTCUT: Send Request (Cmd/Ctrl+Enter)', () => {
      test('sends request when cursor is in JSON body editor', async ({ page }) => {
        // Create a POST request in the shared collection pointing to the echo server
        await createRequest(page, 'cmd-enter-req-body', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'cmd-enter-req-body', { persist: true });

        console.log('1');
        // Open Body tab and select JSON mode
        await selectRequestPaneTab(page, 'Body');
        await page.getByTestId('request-body-mode-selector').click();
        await page.locator('.dropdown-item').filter({ hasText: /^JSON$/ }).click();

        console.log('2');
        // Focus the body code editor and type JSON
        const bodyEditor = page.getByTestId('request-body-editor').locator('.CodeMirror');
        await bodyEditor.click();
        await page.keyboard.type('{"name": "Bruno", "version": 2, "tags": ["api", "client", "http"], "active": true, "meta": {"author": "user", "created": "2025-01-01", "updated": "2025-06-01"}, "counts": {"requests": 42, "collections": 7}}');
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"', { timeout: 5000 });

        console.log('3');
        // Cursor is still in the body CodeMirror - press Cmd/Ctrl+Enter to send
        await page.keyboard.press(`${modifier}+Enter`);

        console.log('4');
        // Verify a 200 response came back
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
        console.log('5');
      });

      test('sends request when cursor is in response body editor', async ({ page }) => {
        await createRequest(page, 'cmd-enter-req-resp', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'cmd-enter-req-resp', { persist: true });

        console.log('1');
        await selectRequestPaneTab(page, 'Body');
        await page.getByTestId('request-body-mode-selector').click();
        await page.locator('.dropdown-item').filter({ hasText: /^JSON$/ }).click();

        console.log('2');
        const bodyEditor = page.getByTestId('request-body-editor').locator('.CodeMirror');
        await bodyEditor.click();
        await page.keyboard.type('{"name": "Bruno", "version": 2, "tags": ["api", "client", "http"], "active": true, "meta": {"author": "user", "created": "2025-01-01", "updated": "2025-06-01"}, "counts": {"requests": 42, "collections": 7}}');
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"', { timeout: 5000 });

        console.log('3');
        // First send to populate response
        await page.keyboard.press(`${modifier}+Enter`);
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        console.log('4');
        // Focus cursor inside the response body CodeMirror
        const responseEditor = page.getByTestId('response-preview-container').locator('.CodeMirror').first();
        await responseEditor.waitFor({ state: 'visible', timeout: 5000 });
        await responseEditor.click();

        console.log('5');
        // Press Cmd/Ctrl+Enter again - should re-send the request
        await page.keyboard.press(`${modifier}+Enter`);

        console.log('6');
        // Verify a 200 response came back (no error, status stays/refreshes to 200)
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
        console.log('7');
      });

      test('sends request when cursor is in pre-request Vars value editor', async ({ page }) => {
        await createRequest(page, 'cmd-enter-req-vars', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'cmd-enter-req-vars', { persist: true });

        console.log('1');
        // Open Vars tab - request Vars has a Pre Request section as the first table
        await selectRequestPaneTab(page, 'Vars');

        console.log('2');
        // Fill the first var row: name=var-1
        const varsTable = page.getByTestId('request-pane').locator('table').first();
        const firstRow = varsTable.locator('tbody tr').first();
        const nameInput = firstRow.locator('input[type="text"]').first();
        await nameInput.click();
        await nameInput.fill('var-1');

        console.log('3');
        // Click the value CodeMirror editor and type a multi-line value
        const valueEditor = firstRow.locator('.CodeMirror').first();
        await valueEditor.click();
        await page.keyboard.type('val-1');
        await page.keyboard.press('Enter'); // insert newline in value editor
        await page.keyboard.type('val-2');

        console.log('4');
        // Cursor is still in the value CodeMirror - press Cmd/Ctrl+Enter to send
        // (should NOT insert a newline; should fire sendRequest)
        await page.keyboard.press(`${modifier}+Enter`);

        console.log('5');
        // Verify a 200 response came back
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
        console.log('6');
      });
    });

    test.describe('SHORTCUT: Send Request (customized Shift+Enter)', () => {
      test('sends request when cursor is in JSON body editor', async ({ page }) => {
        // Remap sendRequest to Shift+Enter
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sendRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-sendRequest').click();
        await expect(page.getByTestId('keybinding-input-sendRequest')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Shift');
        await page.keyboard.down('Enter');
        await page.keyboard.up('Enter');
        await page.keyboard.up('Shift');

        console.log('3');
        // Create a POST request in the shared collection pointing to the echo server
        await createRequest(page, 'shift-enter-req-body', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'shift-enter-req-body', { persist: true });

        console.log('4');
        // Open Body tab and select JSON mode
        await selectRequestPaneTab(page, 'Body');
        await page.getByTestId('request-body-mode-selector').click();
        await page.locator('.dropdown-item').filter({ hasText: /^JSON$/ }).click();

        console.log('5');
        const bodyEditor = page.getByTestId('request-body-editor').locator('.CodeMirror');
        await bodyEditor.click();
        await page.keyboard.type('{"name": "Bruno", "version": 2, "tags": ["api", "client", "http"], "active": true, "meta": {"author": "user", "created": "2025-01-01", "updated": "2025-06-01"}, "counts": {"requests": 42, "collections": 7}}');
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"', { timeout: 5000 });

        console.log('6');
        // Cursor is still in the body CodeMirror - press Shift+Enter (customized) to send
        await page.keyboard.press('Shift+Enter');

        console.log('7');
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        console.log('8');
        // Reset Default
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
        console.log('9');
      });

      test('sends request when cursor is in response body editor', async ({ page }) => {
        // Remap sendRequest to Shift+Enter
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sendRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-sendRequest').click();
        await expect(page.getByTestId('keybinding-input-sendRequest')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Shift');
        await page.keyboard.down('Enter');
        await page.keyboard.up('Enter');
        await page.keyboard.up('Shift');

        console.log('3');
        await createRequest(page, 'shift-enter-req-resp', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'shift-enter-req-resp', { persist: true });

        console.log('4');
        await selectRequestPaneTab(page, 'Body');
        await page.getByTestId('request-body-mode-selector').click();
        await page.locator('.dropdown-item').filter({ hasText: /^JSON$/ }).click();

        console.log('5');
        const bodyEditor = page.getByTestId('request-body-editor').locator('.CodeMirror');
        await bodyEditor.click();
        await page.keyboard.type('{"name": "Bruno", "version": 2, "tags": ["api", "client", "http"], "active": true, "meta": {"author": "user", "created": "2025-01-01", "updated": "2025-06-01"}, "counts": {"requests": 42, "collections": 7}}');
        await expect(page.getByTestId('request-body-editor')).toContainText('"name": "Bruno"', { timeout: 5000 });

        console.log('6');
        // First send with Shift+Enter to populate response
        await page.keyboard.press('Shift+Enter');
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        console.log('7');
        // Focus cursor inside the response body CodeMirror
        const responseEditor = page.getByTestId('response-preview-container').locator('.CodeMirror').first();
        await responseEditor.waitFor({ state: 'visible', timeout: 5000 });
        await responseEditor.click();

        console.log('8');
        // Press Shift+Enter again - should re-send the request
        await page.keyboard.press('Shift+Enter');

        console.log('9');
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        console.log('10');
        // Reset Default
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
        console.log('11');
      });

      test('sends request when cursor is in pre-request Vars value editor', async ({ page }) => {
        // Remap sendRequest to Shift+Enter
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sendRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-sendRequest').click();
        await expect(page.getByTestId('keybinding-input-sendRequest')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Shift');
        await page.keyboard.down('Enter');
        await page.keyboard.up('Enter');
        await page.keyboard.up('Shift');

        console.log('3');
        await createRequest(page, 'shift-enter-req-vars', 'kb-collection', {
          url: 'https://echo.usebruno.com',
          method: 'POST'
        });
        await openRequest(page, 'kb-collection', 'shift-enter-req-vars', { persist: true });

        console.log('4');
        await selectRequestPaneTab(page, 'Vars');

        console.log('5');
        const varsTable = page.getByTestId('request-pane').locator('table').first();
        const firstRow = varsTable.locator('tbody tr').first();
        const nameInput = firstRow.locator('input[type="text"]').first();
        await nameInput.click();
        await nameInput.fill('var-1');

        console.log('6');
        const valueEditor = firstRow.locator('.CodeMirror').first();
        await valueEditor.click();
        await page.keyboard.type('val-1');
        await page.keyboard.press('Enter'); // insert newline in value editor
        await page.keyboard.type('val-2');

        console.log('7');
        // Cursor is still in the value CodeMirror - press Shift+Enter (customized) to send
        await page.keyboard.press('Shift+Enter');

        console.log('8');
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

        console.log('9');
        // Reset Default
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
        console.log('10');
      });
    });

    test.describe('SHORTCUT: Change Orientation (Cmd/Ctrl+J)', () => {
      test('default Cmd/Ctrl+J change layout orientation', async ({ page, createTmpDir }) => {
        await openRequest(page, 'kb-collection', 'req-5', { persist: true });

        console.log('1');
        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.press(`${modifier}+KeyJ`);

        console.log('2');
        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to horizontal layout', { timeout: 2000 });

        console.log('3');
        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.press(`${modifier}+KeyJ`);

        console.log('4');
        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to vertical layout', { timeout: 2000 });

        console.log('5');
        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.press(`${modifier}+KeyJ`);

        console.log('6');
        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to horizontal layout', { timeout: 2000 });
        console.log('7');
      });
    });

    test.describe('SHORTCUT: Change Orientation (customized Alt+Shift+Y)', () => {
      test('customized Alt+Shift+Y change layout orientation', async ({ page, createTmpDir }) => {
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-changeLayout');
        await row.hover();
        await page.getByTestId('keybinding-edit-changeLayout').click();
        await expect(page.getByTestId('keybinding-input-changeLayout')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Alt');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Alt');

        console.log('3');
        await openRequest(page, 'kb-collection', 'req-5', { persist: true });

        console.log('4');
        await page.keyboard.down('Alt');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Alt');

        console.log('5');
        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to vertical layout', { timeout: 2000 });

        console.log('6');
        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.down('Alt');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Alt');

        console.log('7');
        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to horizontal layout', { timeout: 2000 });

        console.log('8');
        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.down('Alt');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Alt');

        console.log('9');
        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to vertical layout', { timeout: 2000 });
        console.log('10');
      });
    });
  });
});
