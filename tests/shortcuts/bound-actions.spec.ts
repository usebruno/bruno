import { test, expect } from '../../playwright';
import { createCollection, createRequest, openRequest, closeAllCollections, createFolder, openCollection } from '../utils/page';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

// ─── Shared helpers ─────────────────────────────────────────────────────────────

const openKeybindingsTab = async (page) => {
  await page.getByRole('button', { name: 'Open Preferences' }).click();
  await page.getByRole('tab', { name: 'Keybindings' }).click();
  await expect(page.locator('.section-header').filter({ hasText: 'Keybindings' })).toBeVisible();
};

/**
 * Close the Preferences tab by clicking its close button.
 * Using the close button avoids depending on any keyboard shortcut that may
 * have just been reconfigured.
 */
const closePreferencesTab = async (page) => {
  const prefTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
  await prefTab.hover();
  await prefTab.getByTestId('request-tab-close-icon').click({ force: true });
  await expect(prefTab).not.toBeVisible({ timeout: 2000 });
};

const closeTabByName = async (page: any, name: string | RegExp) => {
  const tab = page.locator('.request-tab').filter({ hasText: name });
  await tab.hover();
  await tab.getByTestId('request-tab-close-icon').click({ force: true });
  await expect(tab).not.toBeVisible({ timeout: 2000 });
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 5000 });
  });

  test.describe('TABS', () => {
    test.describe('SHORTCUT: closeTab', () => {
      test('default Cmd/Ctrl+W closes the active tab', async ({ page, createTmpDir }) => {
        await closeAllCollections(page);

        const path = await createTmpDir('kb-collection-path');
        await createCollection(page, 'kb-collection', path);
        await createRequest(page, 'req-1', 'kb-collection');
        await openRequest(page, 'kb-collection', 'req-1', { persist: true });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 2000 });

        await page.keyboard.press(`${modifier}+KeyW`);
        await expect(page.locator('.request-tab')).toHaveCount(2, { timeout: 3000 });
      });

      test('customized Cmd/Ctrl+Shift+X closes the active tab', async ({ page, createTmpDir }) => {
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
        await openRequest(page, 'kb-collection', 'req-1', { persist: true });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyX');
        await page.keyboard.up('KeyX');
        await page.keyboard.up('Shift');
        await expect(page.locator('.request-tab')).toHaveCount(2, { timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: closeAllTabs', () => {
      test('default Cmd/Ctrl+Shift+W closes all tabs', async ({ page }) => {
        await createRequest(page, 'req-2', 'kb-collection');
        await createRequest(page, 'req-3', 'kb-collection');
        await openRequest(page, 'kb-collection', 'req-1', { persist: true });
        await openRequest(page, 'kb-collection', 'req-2', { persist: true });
        await openRequest(page, 'kb-collection', 'req-3', { persist: true });
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

      test('customized Alt+Y closes all tabs', async ({ page }) => {
        // Remap closeAllTabs to Alt+Y
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-closeAllTabs');
        await row.hover();
        await page.getByTestId('keybinding-edit-closeAllTabs').click();
        await expect(page.getByTestId('keybinding-input-closeAllTabs')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await closePreferencesTab(page);

        await openRequest(page, 'kb-collection', 'req-1', { persist: true });
        await openRequest(page, 'kb-collection', 'req-2', { persist: true });
        await openRequest(page, 'kb-collection', 'req-3', { persist: true });
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

    test.describe('SHORTCUT: switchToPreviousTab', () => {
      test('default Cmd/Ctrl+Shift+[ switches to previous tab', async ({ page }) => {
        await createRequest(page, 'req-4', 'kb-collection');
        await createRequest(page, 'req-5', 'kb-collection');
        await createRequest(page, 'req-6', 'kb-collection');
        await openRequest(page, 'kb-collection', 'req-4', { persist: true });
        await openRequest(page, 'kb-collection', 'req-5', { persist: true });
        await openRequest(page, 'kb-collection', 'req-6', { persist: true });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-6' })).toBeVisible({ timeout: 2000 });

        // req-6 is active (last opened) — press previous → req-5
        await page.keyboard.press(`${modifier}+Shift+BracketLeft`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });

        // Press again → req-4
        await page.keyboard.press(`${modifier}+Shift+BracketLeft`);
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-4/, { timeout: 3000 });
      });

      test('customized Shift+P switches to previous tab', async ({ page }) => {
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
        await openRequest(page, 'kb-collection', 'req-4', { persist: true });
        await openRequest(page, 'kb-collection', 'req-5', { persist: true });
        await openRequest(page, 'kb-collection', 'req-6', { persist: true });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-6' })).toBeVisible({ timeout: 2000 });

        // req-6 is active — press Shift+P → req-5
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyP');
        await page.keyboard.up('KeyP');
        await page.keyboard.up('Shift');
        await expect(page.locator('li.request-tab.active')).toHaveText(/req-5/, { timeout: 3000 });
      });
    });

    test.describe('SHORTCUT: switchToNextTab', () => {
      test('default Cmd/Ctrl+Shift+] switches to next tab', async ({ page }) => {
        await openRequest(page, 'kb-collection', 'req-4', { persist: true });
        await openRequest(page, 'kb-collection', 'req-5', { persist: true });
        await openRequest(page, 'kb-collection', 'req-6', { persist: true });

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

      test('customized Shift+N switches to next tab', async ({ page }) => {
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

        await openRequest(page, 'kb-collection', 'req-4', { persist: true });
        await openRequest(page, 'kb-collection', 'req-5', { persist: true });
        await openRequest(page, 'kb-collection', 'req-6', { persist: true });

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

    test.describe('SHORTCUT: moveTabLeft', () => {
      test('default Cmd/Ctrl+[ moves active tab left', async ({ page }) => {
        await createRequest(page, 'req-7', 'kb-collection');
        await createRequest(page, 'req-8', 'kb-collection');
        await createRequest(page, 'req-9', 'kb-collection');
        await openRequest(page, 'kb-collection', 'req-7', { persist: true });
        await openRequest(page, 'kb-collection', 'req-8', { persist: true });
        await openRequest(page, 'kb-collection', 'req-9', { persist: true });

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

      test('customized Alt+L moves active tab left', async ({ page }) => {
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

    test.describe('SHORTCUT: moveTabRight', () => {
      test('default Cmd/Ctrl+] moves active tab right', async ({ page }) => {
        // req-9 is active and first
        const tabs = page.locator('.request-tab');

        await page.keyboard.press(`${modifier}+BracketRight`);
        await expect(tabs.nth(1)).toHaveText(/req-9/, { timeout: 3000 });
        await page.keyboard.press(`${modifier}+BracketRight`);
        await expect(tabs.nth(2)).toHaveText(/req-9/);
        await page.keyboard.press(`${modifier}+BracketRight`);
        await expect(tabs.nth(3)).toHaveText(/req-9/, { timeout: 3000 });
      });

      test('customized Alt+R moves active tab right', async ({ page }) => {
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

        await openRequest(page, 'kb-collection', 'req-9', { persist: true });

        // req-9 is active
        const tabs = page.locator('.request-tab');
        await expect(tabs.nth(3)).toHaveText(/req-9/, { timeout: 3000 });

        // Press Alt+L → req-9 moves right, req-8 becomes last
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyR');
        await page.keyboard.up('KeyR');
        await page.keyboard.up('Alt');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyR');
        await page.keyboard.up('KeyR');
        await page.keyboard.up('Alt');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyR');
        await page.keyboard.up('KeyR');
        await page.keyboard.up('Alt');
        await expect(tabs.nth(6)).toHaveText(/req-9/);

        // Close all tabs
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');
      });
    });

    test.describe('SHORTCUT: Switch to Tab at Position Ctrl/Cmd-1 through Ctrl/Cmd-8', () => {
      test('default Cmd/Ctrl+1-8 open tab from 1-8', async ({ page }) => {
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

    test.describe('SHORTCUT: reopenLastClosedTab', () => {
      test('default Cmd/Ctrl+Shift+T reopens last closed request tab', async ({ page }) => {
        await openRequest(page, 'kb-collection', 'req-1', { persist: true });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyX');
        await page.keyboard.up('KeyX');
        await page.keyboard.up('Shift');
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).not.toBeVisible({ timeout: 2000 });

        await page.keyboard.press(`${modifier}+Shift+KeyT`);
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 3000 });
      });

      test('default Cmd/Ctrl+Shift+T reopens multiple tab types in LIFO order', async ({ page }) => {
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
        await createFolder(page, 'kb-folder', 'kb-collection', true);
        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).dblclick();

        // Close in order: kb-folder (last closed) → kb-collection → variables → Runner
        await closeTabByName(page, 'kb-folder');
        await closeTabByName(page, 'Collection');
        await closeTabByName(page, 'Variables');
        await closeTabByName(page, 'Runner');

        // Reopen LIFO: Runner was closed last → reopens first
        await page.keyboard.press(`${modifier}+Shift+KeyT`);
        await expect(page.locator('.request-tab').filter({ hasText: 'Runner' })).toBeVisible({ timeout: 3000 });

        await page.keyboard.press(`${modifier}+Shift+KeyT`);
        await expect(page.locator('.request-tab').filter({ hasText: /variables/i })).toBeVisible({ timeout: 3000 });

        await page.keyboard.press(`${modifier}+Shift+KeyT`);
        await expect(page.locator('.request-tab').filter({ hasText: 'Collection' })).toBeVisible({ timeout: 3000 });

        await page.keyboard.press(`${modifier}+Shift+KeyT`);
        await expect(page.locator('.request-tab').filter({ hasText: 'kb-folder' })).toBeVisible({ timeout: 3000 });
      });

      test('customized Alt+Z reopens last closed tab', async ({ page }) => {
        // Remap reopenLastClosedTab to Alt+Z
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-reopenLastClosedTab');
        await row.hover();
        await page.getByTestId('keybinding-edit-reopenLastClosedTab').click();
        await expect(page.getByTestId('keybinding-input-reopenLastClosedTab')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyZ');
        await page.keyboard.up('KeyZ');
        await page.keyboard.up('Alt');

        await closePreferencesTab(page);

        await openRequest(page, 'kb-collection', 'req-1', { persist: true });
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyX');
        await page.keyboard.up('KeyX');
        await page.keyboard.up('Shift');
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).not.toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyZ');
        await page.keyboard.up('KeyZ');
        await page.keyboard.up('Alt');
        await expect(page.locator('.request-tab').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 3000 });
      });
    });
  });

  test.describe('TERMINAL', () => {
    test.describe('SHORTCUT: openTerminal', () => {
      test('default Cmd/Ctrl+T opens terminal', async ({ page, createTmpDir }) => {
        // Open Collection-Settings tab (double-click collection name)
        await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).click();
        await expect(page.locator('.request-tab').filter({ hasText: 'collection' })).toBeVisible({ timeout: 2000 });

        // Press Cmd/Ctrl+T to open terminal at workspace level
        await page.keyboard.press(`${modifier}+KeyT`);

        // Verify terminal session is visible using data-testid
        const collectionTerminalSession = page.getByTestId('session-list-0');
        await expect(collectionTerminalSession).toBeVisible({ timeout: 2000 });

        const collectionSession = collectionTerminalSession;
        await expect(collectionSession).toContainText('kb-collection');
        await page.getByTitle('Close console').click();

        // Open folder settings
        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).dblclick();
        await expect(page.locator('.request-tab').filter({ hasText: 'kb-folder' })).toBeVisible({ timeout: 2000 });

        await page.keyboard.press(`${modifier}+KeyT`);
        const folderTerminalSession = page.getByTestId('session-list-1');
        await expect(folderTerminalSession).toBeVisible({ timeout: 2000 });

        // Verify the terminal session name is the workspace name (default_workspace)
        const folderSessionName = folderTerminalSession;
        await expect(folderSessionName).toContainText('kb-folder');

        // Close all sessions with terminal tab
        await page.getByTestId('session-close-0').click();
        await page.waitForTimeout(500);
        await page.getByTestId('session-close-0').click();
        await expect(page.getByTestId('session-close-0')).not.toBeVisible({ timeout: 3000 });
        await page.getByTitle('Close console').click();
      });

      test('customized Alt+T opens terminal', async ({ page, createTmpDir }) => {
        // Remap openTerminal to Alt+T
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-openTerminal');
        await row.hover();
        await page.getByTestId('keybinding-edit-openTerminal').click();
        await expect(page.getByTestId('keybinding-input-openTerminal')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyT');
        await page.keyboard.up('KeyT');
        await page.keyboard.up('Alt');

        await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).click();
        await expect(page.locator('.request-tab').filter({ hasText: 'collection' })).toBeVisible({ timeout: 2000 });

        // Press Cmd/Ctrl+T to open terminal at workspace level
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyT');
        await page.keyboard.up('KeyT');
        await page.keyboard.up('Alt');
        await page.waitForTimeout(500);

        // Verify terminal session is visible using data-testid
        const collectionTerminalSession = page.getByTestId('session-list-0');
        await expect(collectionTerminalSession).toBeVisible({ timeout: 2000 });

        const collectionSession = collectionTerminalSession;
        await expect(collectionSession).toContainText('kb-collection');

        // Open folder settings
        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).dblclick();

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyT');
        await page.keyboard.up('KeyT');
        await page.keyboard.up('Alt');
        const folderTerminalSession = page.getByTestId('session-list-1');
        await expect(folderTerminalSession).toBeVisible({ timeout: 2000 });

        // Verify the terminal session name is the workspace name (default_workspace)
        const folderSessionName = folderTerminalSession;
        await expect(folderSessionName).toContainText('kb-folder');

        // Close all sessions with terminal tab
        await page.getByTestId('session-close-0').click();
        await page.waitForTimeout(500);
        await page.getByTestId('session-close-0').click();
        await expect(page.getByTestId('session-close-0')).not.toBeVisible({ timeout: 3000 });
        await page.getByTitle('Close console').click();
      });
    });
  });

  test.describe('SIDEBAR', () => {
    test.describe('SHORTCUT: Sidebar search', () => {
      test('default Cmd/Ctrl+F open sidebar search', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.keyboard.press(`${modifier}+KeyF`);

        await expect(page.getByPlaceholder('Search requests...')).toBeVisible({ timeout: 3000 });
        await page.getByTitle('Search requests').click();
      });

      test('customized Alt+F opens sidebar search', async ({ page }) => {
        // Remap sidebarSearch to Alt+F
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sidebarSearch');
        await row.hover();
        await page.getByTestId('keybinding-edit-sidebarSearch').click();
        await expect(page.getByTestId('keybinding-input-sidebarSearch')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyF');
        await page.keyboard.up('KeyF');
        await page.keyboard.up('Alt');

        // Press Cmd/Ctrl+T to open sidebar search
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyF');
        await page.keyboard.up('KeyF');
        await page.keyboard.up('Alt');

        await expect(page.getByPlaceholder('Search requests...')).toBeVisible({ timeout: 3000 });
        await page.getByTitle('Search requests').click();
      });
    });

    test.describe('SHORTCUT: New request', () => {
      test('default Cmd/Ctrl+N open new request modal', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).click();

        await page.keyboard.press(`${modifier}+KeyN`);

        await page.getByTestId('request-name').fill('nr-folder');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-folder' })).toBeVisible({ timeout: 2000 });
      });

      test('customized Alt+N open new request modal', async ({ page, createTmpDir }) => {
        // Remap newRequest to Alt+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-newRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-newRequest').click();
        await expect(page.getByTestId('keybinding-input-newRequest')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).click();

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        await page.getByTestId('request-name').fill('nr-collection');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-collection' })).toBeVisible({ timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: Rename Item', () => {
      test('default Cmd/Ctrl+R open rename item modal for request', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).dblclick();
        await openRequest(page, 'kb-collection', 'req-1', { persist: true });
        await page.keyboard.press(`${modifier}+KeyR`);

        // Verify rename modal opens
        const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename request/i });
        await expect(renameModal).toBeVisible({ timeout: 3000 });

        // Fill in the rename req name
        const requestNameInput = page.locator('#collection-item-name');
        await requestNameInput.fill('req-1-renamed');

        // Click the rename button
        await page.getByTestId('rename-item-button').click();

        // Verify renamed request appears in sidebar
        // await expect(page.locator('.collection-item-name').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.collection-item-name').filter({ hasText: 'req-1-rename' })).toBeVisible({ timeout: 2000 });
      });

      test('default Cmd/Ctrl+R open rename item modal for folder', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).dblclick();
        await page.keyboard.press(`${modifier}+KeyR`);

        // Verify rename modal opens
        const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename folder/i });
        await expect(renameModal).toBeVisible({ timeout: 3000 });

        // Fill in the rename req name
        const folderNameInput = page.locator('#collection-item-name');
        await folderNameInput.fill('kb-folder-renamed');

        // Click the rename button
        await page.getByTestId('rename-item-button').click();

        // Verify renamed request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder-renamed' })).toBeVisible({ timeout: 2000 });
      });

      test('default Cmd/Ctrl+R open rename item modal for collection', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).click();
        await page.keyboard.press(`${modifier}+KeyR`);

        // Verify rename modal opens
        const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename collection/i });
        await expect(renameModal).toBeVisible({ timeout: 3000 });

        // Fill in the rename req name
        const collectionInput = page.locator('#collection-name');
        await collectionInput.fill('kb-collection-renamed');

        // Click the rename button
        await page.locator('.submit').click();

        // Verify renamed request appears in sidebar
        await expect(page.locator('.collection-name').filter({ hasText: 'kb-collection-renamed' })).toBeVisible({ timeout: 3000 });
      });

      test('customized Alt+X open rename item modal for request', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap renameItem to Alt+R
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-renameItem');
        await row.hover();
        await page.getByTestId('keybinding-edit-renameItem').click();
        await expect(page.getByTestId('keybinding-input-renameItem')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyX');
        await page.keyboard.up('KeyX');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-1-renamed', { persist: true });
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyX');
        await page.keyboard.up('KeyX');
        await page.keyboard.up('Alt');

        // Verify rename modal opens
        const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename request/i });
        await expect(renameModal).toBeVisible({ timeout: 3000 });

        // Fill in the rename req name
        const requestNameInput = page.locator('#collection-item-name');
        await requestNameInput.fill('req-1');

        // Click the rename button
        await page.getByTestId('rename-item-button').click();

        // Verify renamed request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'req-1' })).toBeVisible({ timeout: 2000 });
      });

      test('customized Alt+R open rename item modal for folder', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder-renamed' }).dblclick();
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyX');
        await page.keyboard.up('KeyX');
        await page.keyboard.up('Alt');

        // Verify rename modal opens
        const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename folder/i });
        await expect(renameModal).toBeVisible({ timeout: 3000 });

        // Fill in the rename req name
        const folderNameInput = page.locator('#collection-item-name');
        await folderNameInput.fill('kb-folder');

        // Click the rename button
        await page.getByTestId('rename-item-button').click();

        // Verify renamed request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder' })).toBeVisible({ timeout: 2000 });
      });

      test('customized Alt+R open rename item modal for collection', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.locator('.collection-name').filter({ hasText: 'kb-collection-renamed' }).click();
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyX');
        await page.keyboard.up('KeyX');
        await page.keyboard.up('Alt');

        // Verify rename modal opens
        const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename collection/i });
        await expect(renameModal).toBeVisible({ timeout: 3000 });

        // Fill in the rename req name
        const collectionInput = page.locator('#collection-name');
        await collectionInput.fill('kb-collection');

        // Click the rename button
        await page.locator('.submit').click();

        // Verify renamed request appears in sidebar
        await expect(page.locator('.collection-name').filter({ hasText: 'kb-collection' })).toBeVisible({ timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: Clone Item', () => {
      test('default Cmd/Ctrl+D open clone item modal for request', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-1', { persist: true });
        await page.keyboard.press(`${modifier}+KeyD`);

        // Verify clone modal opens
        const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone request/i });
        await expect(cloneModal).toBeVisible({ timeout: 3000 });

        // Fill in the clone req name
        const requestNameInput = page.locator('#collection-item-name');
        await requestNameInput.fill('req-1 clone 1');

        // Click the clone button
        await page.getByTestId('clone-item-button').click();

        // Verify cloned request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'req-1 clone 1' })).toBeVisible({ timeout: 2000 });
      });

      test('default Cmd/Ctrl+D open clone item modal for folder', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).dblclick();
        await page.keyboard.press(`${modifier}+KeyD`);

        // Verify clone modal opens
        const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone folder/i });
        await expect(cloneModal).toBeVisible({ timeout: 3000 });

        // Fill in the clone kb-folder name
        const folderNameInput = page.locator('#collection-item-name');
        await folderNameInput.fill('kb-folder clone 1');

        // Click the clone button
        await page.getByTestId('clone-item-button').click();

        // Verify cloned request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder clone 1' })).toBeVisible({ timeout: 2000 });
      });

      test('customized Alt+D open clone item modal for request', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap cloneItem to Alt+D
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-cloneItem');
        await row.hover();
        await page.getByTestId('keybinding-edit-cloneItem').click();
        await expect(page.getByTestId('keybinding-input-cloneItem')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyD');
        await page.keyboard.up('KeyD');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-2', { persist: true });

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyD');
        await page.keyboard.up('KeyD');
        await page.keyboard.up('Alt');

        // Verify clone modal opens
        const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone request/i });
        await expect(cloneModal).toBeVisible({ timeout: 3000 });

        // Fill in the clone req name
        const requestNameInput = page.locator('#collection-item-name');
        await requestNameInput.fill('req-2 clone 1');

        // Click the clone button
        await page.getByTestId('clone-item-button').click();

        // Verify renamed request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'req-2 clone 1' })).toBeVisible({ timeout: 2000 });
      });

      test('customized Alt+D open clone item modal for folder', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder clone 1' }).dblclick();
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyD');
        await page.keyboard.up('KeyD');
        await page.keyboard.up('Alt');

        // Verify clone modal opens
        const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone folder/i });
        await expect(cloneModal).toBeVisible({ timeout: 3000 });

        // Fill in the clone req name
        const folderNameInput = page.locator('#collection-item-name');
        await folderNameInput.fill('kb-folder clone 2');

        // Click the clone button
        await page.getByTestId('clone-item-button').click();

        // Verify renamed request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder clone 2' })).toBeVisible({ timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: Copy Paste Item', () => {
      test('default Cmd/Ctrl+C/V copy paste item for request', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-3', { persist: true });
        await page.keyboard.press(`${modifier}+KeyC`);
        await page.keyboard.press(`${modifier}+KeyV`);

        // Verify cloned request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'req-3 (1)' })).toBeVisible({ timeout: 2000 });
      });

      test('default Cmd/Ctrl+C/V copy paste item for folder', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'kb-folder clone 2', { persist: true });
        await page.keyboard.press(`${modifier}+KeyC`);
        await page.keyboard.press(`${modifier}+KeyV`);

        // Verify cloned request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder clone 2 (1)' })).toBeVisible({ timeout: 2000 });
      });

      test('customized Alt+C/V copy paste item for request', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap copyItem to Alt+D
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-copyItem');
        await row.hover();
        await page.getByTestId('keybinding-edit-copyItem').click();
        await expect(page.getByTestId('keybinding-input-copyItem')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyC');
        await page.keyboard.up('KeyC');
        await page.keyboard.up('Alt');

        // Remap pasteItem to Alt+V
        await openKeybindingsTab(page);
        const row2 = page.getByTestId('keybinding-row-pasteItem');
        await row2.hover();
        await page.getByTestId('keybinding-edit-pasteItem').click();
        await expect(page.getByTestId('keybinding-input-pasteItem')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyV');
        await page.keyboard.up('KeyV');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-4', { persist: true });
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyC');
        await page.keyboard.up('KeyC');
        await page.keyboard.up('Alt');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyV');
        await page.keyboard.up('KeyV');
        await page.keyboard.up('Alt');

        // Verify cloned request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'req-4 (1)' })).toBeVisible({ timeout: 2000 });
      });

      test('customized Alt+C/V copy paste item for folder', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder clone 2 (1)' }).dblclick();
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyC');
        await page.keyboard.up('KeyC');
        await page.keyboard.up('Alt');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyV');
        await page.keyboard.up('KeyV');
        await page.keyboard.up('Alt');

        // Verify cloned request appears in sidebar
        await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder clone 2 (2)' })).toBeVisible({ timeout: 2000 });
      });
    });
  });

  test.describe('LAYOUT', () => {
    test.describe('SHORTCUT: Change Layout', () => {
      test('default Cmd/Ctrl+J change layout orientation', async ({ page, createTmpDir }) => {
        await openRequest(page, 'kb-collection', 'req-5', { persist: true });

        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.press(`${modifier}+KeyJ`);

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to horizontal layout', { timeout: 2000 });

        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.press(`${modifier}+KeyJ`);

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to vertical layout', { timeout: 2000 });

        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.press(`${modifier}+KeyJ`);

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to horizontal layout', { timeout: 2000 });
      });

      test('customized Alt+Shift+Y change layout orientation', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap changeLayout to Alt+D
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-changeLayout');
        await row.hover();
        await page.getByTestId('keybinding-edit-changeLayout').click();
        await expect(page.getByTestId('keybinding-input-changeLayout')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-5', { persist: true });

        await page.keyboard.down('Alt');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Alt');

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to vertical layout', { timeout: 2000 });

        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.down('Alt');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Alt');

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to horizontal layout', { timeout: 2000 });

        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.down('Alt');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Alt');

        await expect(
          page.getByTestId('response-layout-toggle-btn')
        ).toHaveAttribute('title', 'Switch to vertical layout', { timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: Open Preferences', () => {
      test('default Cmd/Ctrl+, open preferences', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.down(modifier);
        await page.keyboard.down('Comma');
        await page.keyboard.up('Comma');
        await page.keyboard.up(modifier);

        await expect(page.locator('.request-tab.select-none.active.last-tab').filter({ hasText: 'Preferences' })).toBeVisible({ timeout: 2000 });
      });

      test('customized Cmd/Ctrl+P open preferences', async ({ page }) => {
        // Remap openPreferences to Ctrl+P
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-openPreferences');
        await row.hover();
        await page.getByTestId('keybinding-edit-openPreferences').click();
        await expect(page.getByTestId('keybinding-input-openPreferences')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down(modifier);
        await page.keyboard.down('KeyP');
        await page.keyboard.up('KeyP');
        await page.keyboard.up(modifier);

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Press Cmd/Ctrl+J to change layout
        await page.keyboard.down(modifier);
        await page.keyboard.down('KeyP');
        await page.keyboard.up('KeyP');
        await page.keyboard.up(modifier);

        await expect(page.locator('.request-tab.select-none.active.last-tab').filter({ hasText: 'Preferences' })).toBeVisible({ timeout: 2000 });
      });
    });
  });

  test.describe('Search', () => {
    test.describe('SHORTCUT: Global Search Modal', () => {
      test('default Cmd/Ctrl+K Global Search Modal', async ({ page, createTmpDir }) => {
        // Press Cmd/Ctrl+K to global search modal
        await page.keyboard.press(`${modifier}+KeyK`);

        await page.keyboard.down(modifier);
        await page.keyboard.down('KeyK');
        await page.keyboard.up('KeyK');
        await page.keyboard.up(modifier);

        await expect(page.getByPlaceholder('Search collections, requests, or documentation...')).toBeVisible({ timeout: 1000 });

        await page.waitForTimeout(500);
        await page.locator('body').click();
      });
    });
  });

  test.describe('SHORTCUT: Collapse Sidebar', () => {
    test('collapse/expand sidebar using default Cmd/Ctrl+\\', async ({ page, createTmpDir }) => {
      // Get initial sidebar state
      const width = await page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width);

      expect(width).not.toBe('0px');

      await expect(page.getByTestId('collections')).toBeVisible();

      // Press Cmd/Ctrl+\ to collapse sidebar
      await page.keyboard.press(`${modifier}+Backslash`);
      await page.waitForTimeout(1000);

      const newWidth = await page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width);

      expect(newWidth).toBe('0px');
    });

    test('should collapse/expand sidebar using customized-1 Cmd/Ctrl+Shift+B', async ({ page, createTmpDir }) => {
      // Remap collapseSidebar to Shift+G
      await openKeybindingsTab(page);
      const row = page.getByTestId('keybinding-row-collapseSidebar');
      await row.hover();
      await page.getByTestId('keybinding-edit-collapseSidebar').click();
      await expect(page.getByTestId('keybinding-input-collapseSidebar')).toBeVisible({ timeout: 2000 });

      await page.keyboard.down('Backspace');

      await page.keyboard.down('Shift');
      await page.keyboard.down('KeyG');
      await page.keyboard.up('KeyG');
      await page.keyboard.up('Shift');

      await page.keyboard.down('Shift');
      await page.keyboard.down('KeyG');
      await page.keyboard.up('KeyG');
      await page.keyboard.up('Shift');

      // Get initial sidebar state
      const width = await page.locator('aside.sidebar').evaluate((el) =>
        getComputedStyle(el).width
      );

      await page.waitForTimeout(1000);

      expect(width).not.toBe('255px');
    });
  });
});
