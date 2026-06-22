import { expect, test } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  closePreferencesTab,
  closeTabByName,
  collectionName,
  getTabIndex,
  modifier,
  openKeybindingsTab,
  openRequest,
  pressShortcut,
  remapKeybinding,
  reopenClosedTab,
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

  test.describe('TABS', () => {
    test.describe('SHORTCUT: Close Tab', () => {
      test('Close active tab default (Cmd/Ctrl+W)', async ({ pageWithUserData: page }) => {
        await openRequest(page, collectionName, 'req-1', { persist: true });
        const reqTab = page.locator('.request-tab').filter({ has: page.getByText('req-1', { exact: true }) });
        // Click the tab to guarantee it's the focused/active tab before firing the shortcut.
        await reqTab.click();
        await expect(reqTab).toHaveClass(/active/, { timeout: 2000 });

        await pressShortcut(page, modifier, 'KeyW');
        await expect(reqTab).not.toBeVisible({ timeout: 3000 });
      });

      test('Close active tab customized (Shift+X)', async ({ pageWithUserData: page }) => {
        // Remap closeTab to Cmd/Ctrl+Shift+X
        await openKeybindingsTab(page);
        const row = page.getByTestId(`keybinding-row-closeTab`);
        await row.hover();
        await page.getByTestId(`keybinding-edit-closeTab`).click();
        // Wait for input to enter recording mode
        await expect(page.getByTestId(`keybinding-input-closeTab`)).toBeVisible({ timeout: 2000 });

        // Remove the old keybindings
        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Shift', 'KeyX');

        await closePreferencesTab(page);

        await openRequest(page, collectionName, 'req-1', { persist: true });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-1', { exact: true }) })).toBeVisible({ timeout: 2000 });

        await pressShortcut(page, 'Shift', 'KeyX');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-1', { exact: true }) })).not.toBeVisible({ timeout: 3000 });
      });
    });

    // Closing a tab that has unsaved changes must surface the entity-specific
    // "Unsaved changes" confirmation modal (request / folder / collection).
    test.describe('SHORTCUT: Close Tab (Unsaved changes modal)', () => {
      // These tests trigger close with the customized Shift+X binding; set it up
      // once for the group. The top-level afterEach resets it after each test.
      test.beforeEach(async ({ pageWithUserData: page }) => {
        await remapKeybinding(page, 'closeTab', 'Shift', 'KeyX');
        await closePreferencesTab(page);
      });

      test('Close active tab customized (Shift+X) shows unsaved changes modal for request', async ({ pageWithUserData: page }) => {
        // Open a request and make an unsaved change (edit the URL → draft)
        await openRequest(page, collectionName, 'req-1', { persist: true });
        const requestTab = page.locator('.request-tab').filter({ has: page.getByText('req-1', { exact: true }) });
        await expect(requestTab).toBeVisible({ timeout: 2000 });

        await page.locator('#request-url .CodeMirror').click();
        await page.keyboard.type('/users');
        await expect(requestTab.locator('.has-changes-icon')).toBeVisible();

        await pressShortcut(page, 'Shift', 'KeyX');

        // The request "Unsaved changes" modal should appear
        const modal = page.locator('.bruno-modal-card').filter({ has: page.getByText('Unsaved changes', { exact: true }) });
        await expect(modal).toBeVisible({ timeout: 3000 });
        await expect(modal).toContainText('You have unsaved changes in request');
        await expect(modal).toContainText('req-1');
        await expect(modal.getByRole('button', { name: 'Don\'t Save' })).toBeVisible();
        await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible();
        await expect(modal.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

        // Cancel keeps the tab open with its draft intact
        await modal.getByRole('button', { name: 'Cancel' }).click();
        await expect(modal).not.toBeVisible();
        await expect(requestTab.locator('.has-changes-icon')).toBeVisible();

        // Trigger again and discard → the tab closes
        await pressShortcut(page, 'Escape');

        await pressShortcut(page, 'Shift', 'KeyX');

        await expect(modal).toBeVisible({ timeout: 3000 });
        await modal.getByRole('button', { name: 'Don\'t Save' }).click();
        await expect(requestTab).not.toBeVisible({ timeout: 3000 });
      });

      test('Close active tab customized (Shift+X) shows unsaved changes modal for folder', async ({ pageWithUserData: page }) => {
        // Open folder settings and make an unsaved change (add a header → draft)
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-draft-folder', { exact: true }) }).dblclick();
        const folderTab = page.locator('.request-tab').filter({ has: page.getByText('kb-draft-folder', { exact: true }) });
        await expect(folderTab).toBeVisible({ timeout: 3000 });

        const headerRow = page.locator('table').first().locator('tbody tr').first();
        await headerRow.locator('.CodeMirror').first().click();
        await page.keyboard.type('X-Folder-Header');
        await headerRow.locator('.CodeMirror').nth(1).click();
        await page.keyboard.type('folder-value');
        await expect(folderTab.locator('.has-changes-icon')).toBeVisible();

        await pressShortcut(page, 'Shift', 'KeyX');

        // The folder "Unsaved changes" modal should appear
        const modal = page.locator('.bruno-modal-card').filter({ has: page.getByText('Unsaved changes', { exact: true }) });
        await expect(modal).toBeVisible({ timeout: 3000 });
        await expect(modal).toContainText('folder settings');
        await expect(modal).toContainText('kb-draft-folder');
        await expect(modal.getByRole('button', { name: 'Don\'t Save' })).toBeVisible();
        await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible();
        await expect(modal.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

        // Cancel keeps the tab open with its draft intact
        await modal.getByRole('button', { name: 'Cancel' }).click();
        await expect(modal).not.toBeVisible();
        await expect(folderTab.locator('.has-changes-icon')).toBeVisible();

        // Trigger again and discard → the tab closes
        await pressShortcut(page, 'Escape');

        await pressShortcut(page, 'Shift', 'KeyX');

        await expect(modal).toBeVisible({ timeout: 3000 });
        await modal.getByRole('button', { name: 'Don\'t Save' }).click();
        await expect(folderTab).not.toBeVisible({ timeout: 3000 });
      });

      test('Close active tab customized (Shift+X) shows unsaved changes modal for collection', async ({ pageWithUserData: page }) => {
        // Open collection settings and make an unsaved change (add a header → draft)
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).dblclick();
        const collectionTab = page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) });
        await expect(collectionTab).toBeVisible({ timeout: 3000 });

        await page.locator('.tab.headers').click();
        const headerRow = page.locator('table').first().locator('tbody tr').first();
        await headerRow.locator('.CodeMirror').first().click();
        await page.keyboard.type('X-Custom-Header');
        await headerRow.locator('.CodeMirror').nth(1).click();
        await page.keyboard.type('custom-value');
        await expect(collectionTab.locator('.has-changes-icon')).toBeVisible();

        await pressShortcut(page, 'Shift', 'KeyX');

        // The collection "Unsaved changes" modal should appear
        const modal = page.locator('.bruno-modal-card').filter({ has: page.getByText('Unsaved changes', { exact: true }) });
        await expect(modal).toBeVisible({ timeout: 3000 });
        await expect(modal).toContainText('collection settings');
        await expect(modal).toContainText(collectionName);
        await expect(modal.getByRole('button', { name: 'Don\'t Save' })).toBeVisible();
        await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible();
        await expect(modal.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

        // Cancel keeps the tab open with its draft intact
        await modal.getByRole('button', { name: 'Cancel' }).click();
        await expect(modal).not.toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).toBeVisible();

        // Trigger again and discard → the tab closes
        await pressShortcut(page, 'Escape');

        await pressShortcut(page, 'Shift', 'KeyX');

        await expect(modal).toBeVisible({ timeout: 3000 });
        await modal.getByRole('button', { name: 'Don\'t Save' }).click();
        await expect(collectionTab).not.toBeVisible({ timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: Close All Tabs', () => {
      test('Close all tabs default (Cmd/Ctrl+Shift+W)', async ({ pageWithUserData: page }) => {
        await openRequest(page, collectionName, 'req-1', { persist: true });
        await openRequest(page, collectionName, 'req-2', { persist: true });
        await openRequest(page, collectionName, 'req-3', { persist: true });
        await page.getByTestId('runner').click();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-1', { exact: true }) })).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-2', { exact: true }) })).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-3', { exact: true }) })).toBeVisible({ timeout: 2000 });

        await pressShortcut(page, modifier, 'Shift', 'KeyW');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-1', { exact: true }) })).not.toBeVisible({ timeout: 3000 });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-2', { exact: true }) })).not.toBeVisible({ timeout: 3000 });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-3', { exact: true }) })).not.toBeVisible({ timeout: 3000 });
      });

      test('Close all tabs customized (Alt+Y)', async ({ pageWithUserData: page }) => {
        // Remap closeAllTabs to Alt+Y
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-closeAllTabs');
        await row.hover();
        await page.getByTestId('keybinding-row-closeAllTabs').click();
        await expect(page.getByTestId('keybinding-input-closeAllTabs')).toBeVisible({ timeout: 2000 });

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyY');

        await closePreferencesTab(page);

        await openRequest(page, collectionName, 'req-1', { persist: true });
        await openRequest(page, collectionName, 'req-2', { persist: true });
        await openRequest(page, collectionName, 'req-3', { persist: true });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-1', { exact: true }) })).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-2', { exact: true }) })).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-3', { exact: true }) })).toBeVisible({ timeout: 2000 });

        await pressShortcut(page, 'Alt', 'KeyY');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-1', { exact: true }) })).not.toBeVisible({ timeout: 3000 });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-2', { exact: true }) })).not.toBeVisible({ timeout: 3000 });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-3', { exact: true }) })).not.toBeVisible({ timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: Save', () => {
      test('Save tab customized (Cmd/Ctrl+S)', async ({ pageWithUserData: page }) => {
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).dblclick();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // Verify initially there is NO draft indicator (close icon is present)
        const collectionTab = page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) });
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();

        await page.locator('.tab.headers').click();

        const headerTable = page.locator('table').first();
        const headerRow = headerTable.locator('tbody tr').first();

        const nameEditor = headerRow.locator('.CodeMirror').first();
        await nameEditor.click();
        await page.keyboard.type('X-Custom-Header');

        const valueEditor = headerRow.locator('.CodeMirror').nth(1);
        await valueEditor.click();
        await page.keyboard.type('custom-value');

        // Verify draft indicator appears in the tab
        await expect(collectionTab.locator('.has-changes-icon')).toBeVisible();
        await expect(collectionTab.locator('.close-icon')).not.toBeVisible();

        // Save the changes
        await pressShortcut(page, modifier, 'KeyS');

        // Verify draft indicator is gone after saving
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();
      });

      test('Save tab customized (Alt+S)', async ({ pageWithUserData: page }) => {
        // Remap save to Alt+S
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-save');
        await row.hover();
        await page.getByTestId('keybinding-edit-save').click();
        await expect(page.getByTestId('keybinding-input-save')).toBeVisible({ timeout: 2000 });

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyS');

        await closePreferencesTab(page);

        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).dblclick();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // Verify initially there is NO draft indicator (close icon is present)
        const collectionTab = page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) });
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();

        await page.locator('.tab.headers').click();

        const headerTable = page.locator('table').first();
        const headerRow = headerTable.locator('tbody tr').first();

        const nameEditor = headerRow.locator('.CodeMirror').first();
        await nameEditor.click();
        await page.keyboard.type('X-Custom-Header');

        const valueEditor = headerRow.locator('.CodeMirror').nth(1);
        await valueEditor.click();
        await page.keyboard.type('custom-value');

        // Verify draft indicator appears in the tab
        await expect(collectionTab.locator('.has-changes-icon')).toBeVisible();
        await expect(collectionTab.locator('.close-icon')).not.toBeVisible();

        await page.locator('body').click({ position: { x: 1, y: 1 } });

        // Save the changes
        await pressShortcut(page, 'Alt', 'KeyS');

        // Verify draft indicator is gone after saving
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();
      });
    });

    test.describe('SHORTCUT: Save All Tabs', () => {
      test('Save all tabs default (Cmd/Ctrl+Shift+S)', async ({ pageWithUserData: page }) => {
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).dblclick();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // Verify initially there is NO draft indicator (close icon is present)
        const collectionTab = page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) });
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();

        await page.locator('.tab.headers').click();

        const headerTable = page.locator('table').first();
        const headerRow = headerTable.locator('tbody tr').first();

        const nameEditor = headerRow.locator('.CodeMirror').first();
        await nameEditor.click();
        await page.keyboard.type('X-Custom-Header');

        const valueEditor = headerRow.locator('.CodeMirror').nth(1);
        await valueEditor.click();
        await page.keyboard.type('custom-value');

        // Verify draft indicator appears in the tab
        await expect(collectionTab.locator('.has-changes-icon')).toBeVisible();
        await expect(collectionTab.locator('.close-icon')).not.toBeVisible();

        // Open Folder-Settings tab (create folder + double-click)
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-draft-folder', { exact: true }) }).dblclick();

        // Verify folder settings tab is open
        const folderTab = page.locator('.request-tab').filter({ has: page.getByText('kb-draft-folder', { exact: true }) });
        await expect(folderTab).toBeVisible();

        await expect(folderTab.locator('.close-icon')).toBeVisible();
        await expect(folderTab.locator('.has-changes-icon')).not.toBeVisible();

        const folderHeaderTable = page.locator('table').first();
        const folderHeaderRow = folderHeaderTable.locator('tbody tr').first();

        const folderNameEditor = folderHeaderRow.locator('.CodeMirror').first();
        await folderNameEditor.click();
        await page.keyboard.type('X-Folder-Header');

        const folderValueEditor = folderHeaderRow.locator('.CodeMirror').nth(1);
        await folderValueEditor.click();
        await page.keyboard.type('folder-value');

        // Verify draft indicator appears in the folder tab
        await expect(folderTab.locator('.has-changes-icon')).toBeVisible();
        await expect(folderTab.locator('.close-icon')).not.toBeVisible();

        // Save the changes
        await pressShortcut(page, modifier, 'Shift', 'KeyS');

        // Verify draft indicator is gone after saving
        await expect(folderTab.locator('.close-icon')).toBeVisible();
        await expect(folderTab.locator('.has-changes-icon')).not.toBeVisible();

        // Verify draft indicator is gone after saving
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();
      });

      test('Save all tabs customized (Alt+Shift+S)', async ({ pageWithUserData: page }) => {
        // Remap saveAllTabs to Alt+Shift+S
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-saveAllTabs');
        await row.hover();
        await page.getByTestId('keybinding-edit-saveAllTabs').click();
        await expect(page.getByTestId('keybinding-input-saveAllTabs')).toBeVisible({ timeout: 2000 });

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'Shift', 'KeyS');

        await closePreferencesTab(page);

        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText(collectionName, { exact: true }) }).dblclick();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // Verify initially there is NO draft indicator (close icon is present)
        const collectionTab = page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) });
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();

        await page.locator('.tab.headers').click();

        const headerTable = page.locator('table').first();
        const headerRow = headerTable.locator('tbody tr').first();

        const nameEditor = headerRow.locator('.CodeMirror').first();
        await nameEditor.click();
        await page.keyboard.type('X-Custom-Header');

        const valueEditor = headerRow.locator('.CodeMirror').nth(1);
        await valueEditor.click();
        await page.keyboard.type('custom-value');

        // Verify draft indicator appears in the tab
        await expect(collectionTab.locator('.has-changes-icon')).toBeVisible();
        await expect(collectionTab.locator('.close-icon')).not.toBeVisible();

        // Open Folder-Settings tab (create folder + double-click)
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-draft-folder', { exact: true }) }).dblclick();

        // Verify folder settings tab is open
        const folderTab = page.locator('.request-tab').filter({ has: page.getByText('kb-draft-folder', { exact: true }) });
        await expect(folderTab).toBeVisible();

        await expect(folderTab.locator('.close-icon')).toBeVisible();
        await expect(folderTab.locator('.has-changes-icon')).not.toBeVisible();

        const folderHeaderTable = page.locator('table').first();
        const folderHeaderRow = folderHeaderTable.locator('tbody tr').first();

        const folderNameEditor = folderHeaderRow.locator('.CodeMirror').first();
        await folderNameEditor.click();
        await page.keyboard.type('X-Folder-Header');

        const folderValueEditor = folderHeaderRow.locator('.CodeMirror').nth(1);
        await folderValueEditor.click();
        await page.keyboard.type('folder-value');

        // Verify draft indicator appears in the folder tab
        await expect(folderTab.locator('.has-changes-icon')).toBeVisible();
        await expect(folderTab.locator('.close-icon')).not.toBeVisible();

        // Save the changes
        await pressShortcut(page, 'Alt', 'Shift', 'KeyS');

        // Verify draft indicator is gone after saving
        await expect(folderTab.locator('.close-icon')).toBeVisible();
        await expect(folderTab.locator('.has-changes-icon')).not.toBeVisible();

        // Verify draft indicator is gone after saving
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();
      });
    });

    test.describe('SHORTCUT: Switch to Previous Tab', () => {
      test('Switch to Previous Tab default (Cmd/Ctrl+Shift+[)', async ({ pageWithUserData: page }) => {
        await openRequest(page, collectionName, 'req-4', { persist: true });
        await openRequest(page, collectionName, 'req-5', { persist: true });
        await openRequest(page, collectionName, 'req-6', { persist: true });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-6', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // req-6 is active (last opened) - press previous → req-5
        await pressShortcut(page, modifier, 'Shift', 'BracketLeft');
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });

        // Press again → req-4
        await pressShortcut(page, modifier, 'Shift', 'BracketLeft');
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-4/, { timeout: 3000 });
      });

      test('Switch to Previous Tab customized (Shift+P)', async ({ pageWithUserData: page }) => {
        // Remap switchToPreviousTab to Shift+P
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-switchToPreviousTab');
        await row.hover();
        await page.getByTestId('keybinding-edit-switchToPreviousTab').click();
        await expect(page.getByTestId('keybinding-input-switchToPreviousTab')).toBeVisible({ timeout: 2000 });

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Shift', 'KeyP');

        await closePreferencesTab(page);

        // Reuse the same requests opened in the default test
        await openRequest(page, collectionName, 'req-4', { persist: true });
        await openRequest(page, collectionName, 'req-5', { persist: true });
        await openRequest(page, collectionName, 'req-6', { persist: true });
        await expect(page.locator('.request-tab').filter({ has: page.getByText('req-6', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // req-6 is active - press Shift+P → req-5
        await pressShortcut(page, 'Shift', 'KeyP');
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: Switch to Next Tab', () => {
      test('Switch to Next Tab default (Cmd/Ctrl+Shift+])', async ({ pageWithUserData: page }) => {
        await openRequest(page, collectionName, 'req-4', { persist: true });
        await openRequest(page, collectionName, 'req-5', { persist: true });
        await openRequest(page, collectionName, 'req-6', { persist: true });

        // Go back to req-4 to start from the left
        await openRequest(page, 'kb-collection', 'req-4', { persist: true });
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-4/);

        // req-4 is active - press next → req-5
        await pressShortcut(page, modifier, 'Shift', 'BracketRight');
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });

        // Press again → req-6
        await pressShortcut(page, modifier, 'Shift', 'BracketRight');
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-6/, { timeout: 3000 });
      });

      test('Switch to Next Tab customized (Shift+N)', async ({ pageWithUserData: page }) => {
        // Remap switchToNextTab to Shift+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-switchToNextTab');
        await row.hover();
        await page.getByTestId('keybinding-edit-switchToNextTab').click();
        await expect(page.getByTestId('keybinding-input-switchToNextTab')).toBeVisible({ timeout: 2000 });

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Shift', 'KeyN');

        await closePreferencesTab(page);

        await openRequest(page, collectionName, 'req-4', { persist: true });
        await openRequest(page, collectionName, 'req-5', { persist: true });
        await openRequest(page, collectionName, 'req-6', { persist: true });

        // Go back to req-4
        await openRequest(page, 'kb-collection', 'req-4', { persist: true });
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-4/);

        // req-4 is active - press Shift+N → req-5
        await pressShortcut(page, 'Shift', 'KeyN');
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: Move Tab Left', () => {
      test('Move Tab Left default (Cmd/Ctrl+[)', async ({ pageWithUserData: page }) => {
        await openRequest(page, collectionName, 'req-7', { persist: true });
        await openRequest(page, collectionName, 'req-8', { persist: true });
        await openRequest(page, collectionName, 'req-9', { persist: true });

        // req-9 is active and last
        const tabs = page.locator('.request-tab');
        const totalTabs = await tabs.count();
        await expect(tabs.nth(totalTabs - 1)).toHaveText(/req-9/);

        // Press Cmd/Ctrl+[ → req-9 moves left, req-8 becomes last
        await pressShortcut(page, modifier, 'BracketLeft');
        await expect(tabs.nth(totalTabs - 1)).toHaveText(/req-8/, { timeout: 3000 });
        await expect(tabs.nth(totalTabs - 2)).toHaveText(/req-9/);

        // Press again → req-9 moves one more position left
        await pressShortcut(page, modifier, 'BracketLeft');
        await expect(tabs.nth(totalTabs - 3)).toHaveText(/req-9/, { timeout: 3000 });
      });

      test('Move Tab Left customized (Alt+L)', async ({ pageWithUserData: page }) => {
        // Remap moveTabLeft to Alt+L
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-moveTabLeft');
        await row.hover();
        await page.getByTestId('keybinding-edit-moveTabLeft').click();
        await expect(page.getByTestId('keybinding-input-moveTabLeft')).toBeVisible({ timeout: 2000 });

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyL');

        await closePreferencesTab(page);

        await openRequest(page, 'kb-collection', 'req-7', { persist: true });
        await openRequest(page, 'kb-collection', 'req-8', { persist: true });
        await openRequest(page, 'kb-collection', 'req-9', { persist: true });

        // req-9 is active
        const tabs = page.locator('.request-tab');

        // Press Alt+L → req-9 moves left, req-8 becomes last
        await pressShortcut(page, 'Alt', 'KeyL');

        await pressShortcut(page, 'Alt', 'KeyL');

        await pressShortcut(page, 'Alt', 'KeyL');
        await expect(tabs.nth(0)).toHaveText(/req-9/);
      });
    });

    test.describe('SHORTCUT: Move Tab Right', () => {
      test('Move Tab Right default (Cmd/Ctrl+])', async ({ pageWithUserData: page }) => {
        await openRequest(page, collectionName, 'req-6', { persist: true });
        await openRequest(page, collectionName, 'req-7', { persist: true });
        await openRequest(page, collectionName, 'req-8', { persist: true });
        await openRequest(page, collectionName, 'req-9', { persist: true });

        // Move req-9 to first position first
        await pressShortcut(page, modifier, 'BracketLeft');
        await pressShortcut(page, modifier, 'BracketLeft');
        await pressShortcut(page, modifier, 'BracketLeft');
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-9/);
        const startIndex = await getTabIndex(page, 'req-9');
        expect(startIndex).toBeGreaterThanOrEqual(0);

        await pressShortcut(page, modifier, 'BracketRight');
        const indexAfterOneMove = await getTabIndex(page, 'req-9');
        expect(indexAfterOneMove).toBeGreaterThanOrEqual(startIndex);

        await pressShortcut(page, modifier, 'BracketRight');
        const indexAfterTwoMoves = await getTabIndex(page, 'req-9');
        expect(indexAfterTwoMoves).toBeGreaterThanOrEqual(indexAfterOneMove);

        await pressShortcut(page, modifier, 'BracketRight');
        const indexAfterThreeMoves = await getTabIndex(page, 'req-9');
        expect(indexAfterThreeMoves).toBeGreaterThanOrEqual(indexAfterTwoMoves);
      });

      test('Move Tab Right customized (Alt+R)', async ({ pageWithUserData: page }) => {
        // Remap moveTabRight to Alt+R
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-moveTabRight');
        await row.hover();
        await page.getByTestId('keybinding-edit-moveTabRight').click();
        await expect(page.getByTestId('keybinding-input-moveTabRight')).toBeVisible({ timeout: 2000 });

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyR');

        await closePreferencesTab(page);

        await openRequest(page, collectionName, 'req-6', { persist: true });
        await openRequest(page, collectionName, 'req-7', { persist: true });
        await openRequest(page, collectionName, 'req-8', { persist: true });
        await openRequest(page, collectionName, 'req-9', { persist: true });

        const req7Tab = page.locator('.request-tab').filter({ has: page.getByText('req-7', { exact: true }) }).first();
        await req7Tab.click();
        await expect(req7Tab).toHaveClass(/active/);

        const startIndex = await getTabIndex(page, 'req-7');
        expect(startIndex).toBeGreaterThanOrEqual(0);

        // Press Alt+L → req-9 moves right, req-8 becomes last
        await pressShortcut(page, 'Alt', 'KeyR');

        const indexAfterOneMove = await getTabIndex(page, 'req-7');
        expect(indexAfterOneMove).toBeGreaterThan(startIndex);

        await pressShortcut(page, 'Alt', 'KeyR');

        const indexAfterTwoMoves = await getTabIndex(page, 'req-7');
        expect(indexAfterTwoMoves).toBeGreaterThanOrEqual(indexAfterOneMove);

        await pressShortcut(page, 'Alt', 'KeyR');

        const indexAfterThreeMoves = await getTabIndex(page, 'req-7');
        expect(indexAfterThreeMoves).toBeGreaterThanOrEqual(indexAfterTwoMoves);
      });
    });

    test.describe('SHORTCUT: Switch to Tab at Position', () => {
      test('Switch to Tab at Position default (Cmd/Ctrl+1-8)', async ({ pageWithUserData: page }) => {
        // Open req-1..req-9 as persisted tabs (persist: true keeps each tab open).
        for (let i = 1; i <= 9; i++) {
          await openRequest(page, 'kb-collection', `req-${i}`, { persist: true });
        }

        // Cmd/Ctrl+<n> activates the tab at position n.
        for (let pos = 1; pos <= 8; pos++) {
          await pressShortcut(page, modifier, `${pos}`);
          await expect(page.locator('li.request-tab.active')).toHaveText(new RegExp(`req-${pos}`), { timeout: 3000 });
        }
      });
    });

    test.describe('SHORTCUT: Reopen Last Closed Tab', () => {
      test('Reopen Last Closed Tab default (Cmd/Ctrl+Shift+T)', async ({ pageWithUserData: page }) => {
        await openRequest(page, collectionName, 'req-2', { persist: true });
        await openRequest(page, collectionName, 'req-1', { persist: true });
        const req1Tab = page.locator('.request-tab').filter({ has: page.getByText('req-1', { exact: true }) }).first();
        await req1Tab.click();
        await expect(req1Tab).toHaveClass(/active/);
        await closeTabByName(page, 'req-1');

        await reopenClosedTab(page, async () => {
          await pressShortcut(page, modifier, 'Shift', 'KeyT');
        }, 'req-1');
      });

      test('Reopen Last Closed Tab customized (Cmd/Ctrl+Shift+T)', async ({ pageWithUserData: page }) => {
        await openRequest(page, collectionName, 'req-2', { persist: true });

        // Open Collection-Settings tab (double-click collection name)
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).dblclick();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // Open Runner tab
        await page.getByTestId('runner').click();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Runner', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // Open Variables tab
        await page.getByTestId('more-actions').click();
        await page.getByTestId('more-actions-variables').click();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Variables', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // Open Folder-Settings tab (create folder + double-click)
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).dblclick();

        // Close in order: kb-folder (first closed) → Collection → Variables → Runner (last closed)
        await closeTabByName(page, 'kb-folder');
        await closeTabByName(page, 'Collection');
        await closeTabByName(page, 'Variables');
        await closeTabByName(page, 'Runner');

        // Reopen LIFO: Runner was closed last → reopens first
        await reopenClosedTab(page, async () => {
          await pressShortcut(page, modifier, 'Shift', 'KeyT');
        }, 'Runner');
        await reopenClosedTab(page, async () => {
          await pressShortcut(page, modifier, 'Shift', 'KeyT');
        }, /variables/i);
        await reopenClosedTab(page, async () => {
          await pressShortcut(page, modifier, 'Shift', 'KeyT');
        }, 'Collection');
        await reopenClosedTab(page, async () => {
          await pressShortcut(page, modifier, 'Shift', 'KeyT');
        }, 'kb-folder');
      });

      test('Reopen Last Closed Tab customized (Alt+Z)', async ({ pageWithUserData: page }) => {
        await remapKeybinding(page, 'reopenLastClosedTab', 'Alt', 'KeyZ');

        await openRequest(page, collectionName, 'req-2', { persist: true });
        await openRequest(page, collectionName, 'req-1', { persist: true });
        const req1Tab = page.locator('.request-tab').filter({ has: page.getByText('req-1', { exact: true }) }).first();
        await req1Tab.click();
        await expect(req1Tab).toHaveClass(/active/);
        await closeTabByName(page, 'req-1');

        await reopenClosedTab(page, async () => {
          await pressShortcut(page, 'Alt', 'KeyZ');
        }, 'req-1');
      });
    });
  });
});
