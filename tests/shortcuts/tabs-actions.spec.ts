import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  modifier,
  collectionName,
  setupBoundActionsData,
  openRequest,
  openKeybindingsTab,
  closePreferencesTab,
  closeTabByName,
  reopenClosedTab,
  remapKeybinding,
  getTabIndex
} from './helpers';

// ─── Tests ────

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 5000 });
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test.describe('TABS', () => {
    test.describe('SHORTCUT: Close Tab', () => {
      test('Close active tab default (Cmd/Ctrl+W)', async ({ page, createTmpDir }) => {
        await openRequest(page, collectionName, 'req-1', { persist: true });
        const reqTab = page.locator('.request-tab').filter({ hasText: 'req-1' });
        // Click the tab to guarantee it's the focused/active tab before firing the shortcut.
        await reqTab.click();
        await expect(reqTab).toHaveClass(/active/, { timeout: 2000 });

        await page.keyboard.press(`${modifier}+KeyW`);
        await expect(page.locator('.request-tab')).toHaveCount(2, { timeout: 3000 });
      });

      test('Close active tab customized (Cmd/Ctrl+Shift+X)', async ({ page, createTmpDir }) => {
        // Remap closeTab to Cmd/Ctrl+Shift+X
        await openKeybindingsTab(page);
        const row = page.getByTestId(`keybinding-row-closeTab`);
        await row.hover();
        await page.getByTestId(`keybinding-edit-closeTab`).click();
        // Wait for input to enter recording mode
        await expect(page.getByTestId(`keybinding-input-closeTab`)).toBeVisible({ timeout: 2000 });

        // Remove the old keybindings
        await page.keyboard.down('Backspace');

        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyX');
        await page.keyboard.up('KeyX');
        await page.keyboard.up('Shift');

        await closePreferencesTab(page);

        await openRequest(page, collectionName, 'req-1', { persist: true });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyX');
        await page.keyboard.up('KeyX');
        await page.keyboard.up('Shift');
        await expect(page.locator('.request-tab')).toHaveCount(2, { timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: Close All Tabs', () => {
      test('Close all tabs default (Cmd/Ctrl+Shift+W)', async ({ page }) => {
        await openRequest(page, collectionName, 'req-1', { persist: true });
        await openRequest(page, collectionName, 'req-2', { persist: true });
        await openRequest(page, collectionName, 'req-3', { persist: true });
        await page.getByTestId('runner').click();
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-2' })).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-3' })).toBeVisible({ timeout: 2000 });

        await page.keyboard.down(modifier);
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyW');
        await page.keyboard.up('KeyW');
        await page.keyboard.up('Shift');
        await page.keyboard.up(modifier);
        await expect(page.locator('.request-tab')).toHaveCount(2, { timeout: 3000 });
      });

      test('Close all tabs customized (Alt+Y)', async ({ page }) => {
        // Remap closeAllTabs to Alt+Y
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-closeAllTabs');
        await row.hover();
        await page.getByTestId('keybinding-row-closeAllTabs').click();
        await expect(page.getByTestId('keybinding-input-closeAllTabs')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await closePreferencesTab(page);

        await openRequest(page, collectionName, 'req-1', { persist: true });
        await openRequest(page, collectionName, 'req-2', { persist: true });
        await openRequest(page, collectionName, 'req-3', { persist: true });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-2' })).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-3' })).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');
        await expect(page.locator('.request-tab')).toHaveCount(2, { timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: Save', () => {
      test('Save tab customized (Cmd/Ctrl+S)', async ({ page, createTmpDir }) => {
        await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).dblclick();
        await expect(page.locator('.request-tab').filter({ hasText: 'collection' })).toBeVisible({ timeout: 2000 });

        // Verify initially there is NO draft indicator (close icon is present)
        const collectionTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Collection' }) });
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
        await page.keyboard.down(modifier);
        await page.keyboard.down('KeyS');
        await page.keyboard.up('KeyS');
        await page.keyboard.up(modifier);

        // Verify draft indicator is gone after saving
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();
      });

      test('Save tab customized (Alt+S)', async ({ page, createTmpDir }) => {
        // Remap save to Alt+S
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-save');
        await row.hover();
        await page.getByTestId('keybinding-edit-save').click();
        await expect(page.getByTestId('keybinding-input-save')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyS');
        await page.keyboard.up('KeyS');
        await page.keyboard.up('Alt');

        await closePreferencesTab(page);

        await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).dblclick();
        await expect(page.locator('.request-tab').filter({ hasText: 'collection' })).toBeVisible({ timeout: 2000 });

        // Verify initially there is NO draft indicator (close icon is present)
        const collectionTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Collection' }) });
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
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyS');
        await page.keyboard.up('KeyS');
        await page.keyboard.up('Alt');

        // Verify draft indicator is gone after saving
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();
      });
    });

    test.describe('SHORTCUT: Save All Tabs', () => {
      test('Save all tabs default (Cmd/Ctrl+Shift+S)', async ({ page }) => {
        await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).dblclick();
        await expect(page.locator('.request-tab').filter({ hasText: 'collection' })).toBeVisible({ timeout: 2000 });

        // Verify initially there is NO draft indicator (close icon is present)
        const collectionTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Collection' }) });
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
        await page.locator('.collection-item-name').filter({ hasText: 'kb-draft-folder' }).dblclick();

        // Verify folder settings tab is open
        const folderTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'kb-draft-folder' }) });
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
        await page.keyboard.down(modifier);
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyS');
        await page.keyboard.up('KeyS');
        await page.keyboard.up('Shift');
        await page.keyboard.up(modifier);

        // Verify draft indicator is gone after saving
        await expect(folderTab.locator('.close-icon')).toBeVisible();
        await expect(folderTab.locator('.has-changes-icon')).not.toBeVisible();

        // Verify draft indicator is gone after saving
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();
      });

      test('Save all tabs customized (Alt+Shift+S)', async ({ page }) => {
        // Remap saveAllTabs to Alt+Shift+S
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-saveAllTabs');
        await row.hover();
        await page.getByTestId('keybinding-edit-saveAllTabs').click();
        await expect(page.getByTestId('keybinding-input-saveAllTabs')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyS');
        await page.keyboard.up('KeyS');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Alt');

        await closePreferencesTab(page);

        await page.locator('.collection-name').filter({ hasText: collectionName }).dblclick();
        await expect(page.locator('.request-tab').filter({ hasText: 'collection' })).toBeVisible({ timeout: 2000 });

        // Verify initially there is NO draft indicator (close icon is present)
        const collectionTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Collection' }) });
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
        await page.locator('.collection-item-name').filter({ hasText: 'kb-draft-folder' }).dblclick();

        // Verify folder settings tab is open
        const folderTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'kb-draft-folder' }) });
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
        await page.keyboard.down('Alt');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyS');
        await page.keyboard.up('KeyS');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Alt');

        // Verify draft indicator is gone after saving
        await expect(folderTab.locator('.close-icon')).toBeVisible();
        await expect(folderTab.locator('.has-changes-icon')).not.toBeVisible();

        // Verify draft indicator is gone after saving
        await expect(collectionTab.locator('.close-icon')).toBeVisible();
        await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');
      });
    });

    test.describe('SHORTCUT: Switch to Previous Tab', () => {
      test('Switch to Previous Tab default (Cmd/Ctrl+Shift+[)', async ({ page }) => {
        await openRequest(page, collectionName, 'req-4', { persist: true });
        await openRequest(page, collectionName, 'req-5', { persist: true });
        await openRequest(page, collectionName, 'req-6', { persist: true });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-6' })).toBeVisible({ timeout: 2000 });

        // req-6 is active (last opened) — press previous → req-5
        await page.keyboard.press(`${modifier}+Shift+BracketLeft`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });

        // Press again → req-4
        await page.keyboard.press(`${modifier}+Shift+BracketLeft`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-4/, { timeout: 3000 });
      });

      test('Switch to Previous Tab customized (Shift+P)', async ({ page }) => {
        // Remap switchToPreviousTab to Shift+P
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-switchToPreviousTab');
        await row.hover();
        await page.getByTestId('keybinding-edit-switchToPreviousTab').click();
        await expect(page.getByTestId('keybinding-input-switchToPreviousTab')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyP');
        await page.keyboard.up('KeyP');
        await page.keyboard.up('Shift');

        await closePreferencesTab(page);

        // Reuse the same requests opened in the default test
        await openRequest(page, collectionName, 'req-4', { persist: true });
        await openRequest(page, collectionName, 'req-5', { persist: true });
        await openRequest(page, collectionName, 'req-6', { persist: true });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-6' })).toBeVisible({ timeout: 2000 });

        // req-6 is active — press Shift+P → req-5
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyP');
        await page.keyboard.up('KeyP');
        await page.keyboard.up('Shift');
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: Switch to Next Tab', () => {
      test('Switch to Next Tab default (Cmd/Ctrl+Shift+])', async ({ page }) => {
        await openRequest(page, collectionName, 'req-4', { persist: true });
        await openRequest(page, collectionName, 'req-5', { persist: true });
        await openRequest(page, collectionName, 'req-6', { persist: true });

        // Go back to req-4 to start from the left
        await openRequest(page, 'kb-collection', 'req-4', { persist: true });
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-4/);

        // req-4 is active — press next → req-5
        await page.keyboard.press(`${modifier}+Shift+BracketRight`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });

        // Press again → req-6
        await page.keyboard.press(`${modifier}+Shift+BracketRight`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-6/, { timeout: 3000 });
      });

      test('Switch to Next Tab customized (Shift+N)', async ({ page }) => {
        // Remap switchToNextTab to Shift+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-switchToNextTab');
        await row.hover();
        await page.getByTestId('keybinding-edit-switchToNextTab').click();
        await expect(page.getByTestId('keybinding-input-switchToNextTab')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Shift');

        await closePreferencesTab(page);

        await openRequest(page, collectionName, 'req-4', { persist: true });
        await openRequest(page, collectionName, 'req-5', { persist: true });
        await openRequest(page, collectionName, 'req-6', { persist: true });

        // Go back to req-4
        await openRequest(page, 'kb-collection', 'req-4', { persist: true });
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-4/);

        // req-4 is active — press Shift+N → req-5
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Shift');
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: Move Tab Left', () => {
      test('Move Tab Left default (Cmd/Ctrl+[)', async ({ page }) => {
        await openRequest(page, collectionName, 'req-7', { persist: true });
        await openRequest(page, collectionName, 'req-8', { persist: true });
        await openRequest(page, collectionName, 'req-9', { persist: true });

        // req-9 is active and last
        const tabs = page.locator('.request-tab');
        const totalTabs = await tabs.count();
        await expect(tabs.nth(totalTabs - 1)).toHaveText(/req-9/);

        // Press Cmd/Ctrl+[ → req-9 moves left, req-8 becomes last
        await page.keyboard.press(`${modifier}+BracketLeft`);
        await expect(tabs.nth(totalTabs - 1)).toHaveText(/req-8/, { timeout: 3000 });
        await expect(tabs.nth(totalTabs - 2)).toHaveText(/req-9/);

        // Press again → req-9 moves one more position left
        await page.keyboard.press(`${modifier}+BracketLeft`);
        await expect(tabs.nth(totalTabs - 3)).toHaveText(/req-9/, { timeout: 3000 });
      });

      test('Move Tab Left customized (Alt+L)', async ({ page }) => {
        // Remap moveTabLeft to Alt+L
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-moveTabLeft');
        await row.hover();
        await page.getByTestId('keybinding-edit-moveTabLeft').click();
        await expect(page.getByTestId('keybinding-input-moveTabLeft')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyL');
        await page.keyboard.up('KeyL');
        await page.keyboard.up('Alt');

        await closePreferencesTab(page);

        await openRequest(page, 'kb-collection', 'req-7', { persist: true });
        await openRequest(page, 'kb-collection', 'req-8', { persist: true });
        await openRequest(page, 'kb-collection', 'req-9', { persist: true });

        // req-9 is active
        const tabs = page.locator('.request-tab');

        // Press Alt+L → req-9 moves left, req-8 becomes last
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyL');
        await page.keyboard.up('KeyL');
        await page.keyboard.up('Alt');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyL');
        await page.keyboard.up('KeyL');
        await page.keyboard.up('Alt');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyL');
        await page.keyboard.up('KeyL');
        await page.keyboard.up('Alt');
        await expect(tabs.nth(0)).toHaveText(/req-9/);
      });
    });

    test.describe('SHORTCUT: Move Tab Right', () => {
      test('Move Tab Right default (Cmd/Ctrl+])', async ({ page }) => {
        await openRequest(page, collectionName, 'req-6', { persist: true });
        await openRequest(page, collectionName, 'req-7', { persist: true });
        await openRequest(page, collectionName, 'req-8', { persist: true });
        await openRequest(page, collectionName, 'req-9', { persist: true });

        // Move req-9 to first position first
        await page.keyboard.press(`${modifier}+BracketLeft`);
        await page.keyboard.press(`${modifier}+BracketLeft`);
        await page.keyboard.press(`${modifier}+BracketLeft`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-9/);
        const startIndex = await getTabIndex(page, 'req-9');
        expect(startIndex).toBeGreaterThanOrEqual(0);

        await page.keyboard.press(`${modifier}+BracketRight`);
        const indexAfterOneMove = await getTabIndex(page, 'req-9');
        expect(indexAfterOneMove).toBeGreaterThanOrEqual(startIndex);

        await page.keyboard.press(`${modifier}+BracketRight`);
        const indexAfterTwoMoves = await getTabIndex(page, 'req-9');
        expect(indexAfterTwoMoves).toBeGreaterThanOrEqual(indexAfterOneMove);

        await page.keyboard.press(`${modifier}+BracketRight`);
        const indexAfterThreeMoves = await getTabIndex(page, 'req-9');
        expect(indexAfterThreeMoves).toBeGreaterThanOrEqual(indexAfterTwoMoves);
      });

      test('Move Tab Right customized (Alt+R)', async ({ page }) => {
        // Remap moveTabRight to Alt+R
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-moveTabRight');
        await row.hover();
        await page.getByTestId('keybinding-edit-moveTabRight').click();
        await expect(page.getByTestId('keybinding-input-moveTabRight')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyR');
        await page.keyboard.up('KeyR');
        await page.keyboard.up('Alt');

        await closePreferencesTab(page);

        await openRequest(page, collectionName, 'req-6', { persist: true });
        await openRequest(page, collectionName, 'req-7', { persist: true });
        await openRequest(page, collectionName, 'req-8', { persist: true });
        await openRequest(page, collectionName, 'req-9', { persist: true });

        const req7Tab = page.locator('.request-tab').filter({ hasText: 'req-7' }).first();
        await req7Tab.click();
        await expect(req7Tab).toHaveClass(/active/);

        const startIndex = await getTabIndex(page, 'req-7');
        expect(startIndex).toBeGreaterThanOrEqual(0);

        // Press Alt+L → req-9 moves right, req-8 becomes last
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyR');
        await page.keyboard.up('KeyR');
        await page.keyboard.up('Alt');

        const indexAfterOneMove = await getTabIndex(page, 'req-7');
        expect(indexAfterOneMove).toBeGreaterThan(startIndex);

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyR');
        await page.keyboard.up('KeyR');
        await page.keyboard.up('Alt');

        const indexAfterTwoMoves = await getTabIndex(page, 'req-7');
        expect(indexAfterTwoMoves).toBeGreaterThanOrEqual(indexAfterOneMove);

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyR');
        await page.keyboard.up('KeyR');
        await page.keyboard.up('Alt');

        const indexAfterThreeMoves = await getTabIndex(page, 'req-7');
        expect(indexAfterThreeMoves).toBeGreaterThanOrEqual(indexAfterTwoMoves);

        // Close all tabs
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');
      });
    });

    test.describe('SHORTCUT: Switch to Tab at Position', () => {
      test('Switch to Tab at Position default (Cmd/Ctrl+1-8)', async ({ page }) => {
        await openRequest(page, 'kb-collection', 'req-1', { persist: true });
        await openRequest(page, 'kb-collection', 'req-2', { persist: true });
        await openRequest(page, 'kb-collection', 'req-3', { persist: true });
        await openRequest(page, 'kb-collection', 'req-4', { persist: true });
        await openRequest(page, 'kb-collection', 'req-5', { persist: true });
        await openRequest(page, 'kb-collection', 'req-6', { persist: true });
        await openRequest(page, 'kb-collection', 'req-7', { persist: true });
        await openRequest(page, 'kb-collection', 'req-8', { persist: true });
        await openRequest(page, 'kb-collection', 'req-9', { persist: true });

        await expect(page.locator('.request-tab')).toHaveCount(9, { timeout: 2000 });
        const tabs = page.locator('.request-tab');

        await expect(tabs.nth(0)).toHaveText(/req-1/, { timeout: 2000 });
        await page.keyboard.press(`${modifier}+1`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-1/, { timeout: 3000 });
        await page.keyboard.press(`${modifier}+2`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-2/, { timeout: 3000 });
        await page.keyboard.press(`${modifier}+3`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-3/, { timeout: 3000 });
        await page.keyboard.press(`${modifier}+4`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-4/, { timeout: 3000 });
        await page.keyboard.press(`${modifier}+5`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });
        await page.keyboard.press(`${modifier}+6`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-6/, { timeout: 3000 });
        await page.keyboard.press(`${modifier}+7`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-7/, { timeout: 3000 });
        await page.keyboard.press(`${modifier}+8`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-8/, { timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: Reopen Last Closed Tab', () => {
      test('Reopen Last Closed Tab default (Cmd/Ctrl+Shift+T)', async ({ page }) => {
        await openRequest(page, collectionName, 'req-2', { persist: true });
        await openRequest(page, collectionName, 'req-1', { persist: true });
        const req1Tab = page.locator('.request-tab').filter({ hasText: 'req-1' }).first();
        await req1Tab.click();
        await expect(req1Tab).toHaveClass(/active/);
        await closeTabByName(page, 'req-1');

        await reopenClosedTab(page, async () => page.keyboard.press(`${modifier}+Shift+t`), 'req-1');
      });

      test('Reopen Last Closed Tab customized (Cmd/Ctrl+Shift+T)', async ({ page }) => {
        await openRequest(page, collectionName, 'req-2', { persist: true });

        // Open Collection-Settings tab (double-click collection name)
        await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).dblclick();
        await expect(page.locator('.request-tab').filter({ hasText: 'collection' })).toBeVisible({ timeout: 2000 });

        // Open Runner tab
        await page.getByTestId('runner').click();
        await expect(page.locator('.request-tab').filter({ hasText: 'Runner' })).toBeVisible({ timeout: 2000 });

        // Open Variables tab
        await page.getByTestId('more-actions').click();
        await page.getByTestId('more-actions-variables').click();
        await expect(page.locator('.request-tab').filter({ hasText: 'Variables' })).toBeVisible({ timeout: 2000 });

        // Open Folder-Settings tab (create folder + double-click)
        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).dblclick();

        // Close in order: kb-folder (first closed) → Collection → Variables → Runner (last closed)
        await closeTabByName(page, 'kb-folder');
        await closeTabByName(page, 'Collection');
        await closeTabByName(page, 'Variables');
        await closeTabByName(page, 'Runner');

        // Reopen LIFO: Runner was closed last → reopens first
        await reopenClosedTab(page, async () => page.keyboard.press(`${modifier}+Shift+t`), 'Runner');
        await reopenClosedTab(page, async () => page.keyboard.press(`${modifier}+Shift+t`), /variables/i);
        await reopenClosedTab(page, async () => page.keyboard.press(`${modifier}+Shift+t`), 'Collection');
        await reopenClosedTab(page, async () => page.keyboard.press(`${modifier}+Shift+t`), 'kb-folder');
      });

      test('Reopen Last Closed Tab customized (Alt+Z)', async ({ page }) => {
        await remapKeybinding(page, 'reopenLastClosedTab', async () => {
          await page.keyboard.press('Alt+z');
        });

        await openRequest(page, collectionName, 'req-2', { persist: true });
        await openRequest(page, collectionName, 'req-1', { persist: true });
        const req1Tab = page.locator('.request-tab').filter({ hasText: 'req-1' }).first();
        await req1Tab.click();
        await expect(req1Tab).toHaveClass(/active/);
        await closeTabByName(page, 'req-1');

        await reopenClosedTab(page, async () => {
          await page.keyboard.press('Alt+z');
        }, 'req-1');
      });
    });
  });
});
