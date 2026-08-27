import { expect, test } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  modifier,
  openKeybindingsTab,
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

  test.describe('DEVELOPER TOOLS', () => {
    test.describe('SHORTCUT: Open Terminal (Cmd/Ctrl+T)', () => {
      test('default Cmd/Ctrl+T opens terminal', async ({ pageWithUserData: page }) => {
        // Open Collection-Settings tab (double-click collection name)
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).click();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) })).toBeVisible();

        // Press Cmd/Ctrl+T to open terminal at workspace level
        await pressShortcut(page, modifier, 'KeyT');

        // Verify terminal session is visible using data-testid
        const collectionTerminalSession = page.getByTestId('session-list-0');
        await expect(collectionTerminalSession).toBeVisible();

        const collectionSession = collectionTerminalSession;
        await expect(collectionSession).toContainText('kb-collection');
        await page.getByTitle('Close console').click();

        // Open Folder-Settings tab (create folder + double-click)
        // Open folder settings
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-terminal-folder', { exact: true }) }).dblclick();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('kb-terminal-folder', { exact: true }) })).toBeVisible();

        await pressShortcut(page, modifier, 'KeyT');
        const folderTerminalSession = page.getByTestId('session-list-1');
        await expect(folderTerminalSession).toBeVisible();

        // Verify the terminal session name is the workspace name (default_workspace)
        const folderSessionName = folderTerminalSession;
        await expect(folderSessionName).toContainText('kb-terminal-folder');
      });
    });

    test.describe('SHORTCUT: Open Terminal (customized Alt+T)', () => {
      test('customized Alt+T opens terminal', async ({ pageWithUserData: page }) => {
        // Remap openTerminal to Alt+T
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-openTerminal');
        await row.hover();
        await page.getByTestId('keybinding-edit-openTerminal').click();
        await expect(page.getByTestId('keybinding-input-openTerminal')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyT');

        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).click();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) })).toBeVisible();

        // Press Cmd/Ctrl+T to open terminal at workspace level
        await pressShortcut(page, 'Alt', 'KeyT');
        await page.waitForTimeout(500);

        // Verify terminal session is visible using data-testid
        const collectionTerminalSession = page.getByTestId('session-list-0');
        await expect(collectionTerminalSession).toBeVisible();

        const collectionSession = collectionTerminalSession;
        await expect(collectionSession).toContainText('kb-collection');

        // Open folder settings
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-terminal-folder', { exact: true }) }).dblclick();

        await pressShortcut(page, 'Alt', 'KeyT');
        const folderTerminalSession = page.getByTestId('session-list-1');
        await expect(folderTerminalSession).toBeVisible();

        // Verify the terminal session name is the workspace name (default_workspace)
        const folderSessionName = folderTerminalSession;
        await expect(folderSessionName).toContainText('kb-terminal-folder');
      });
    });
  });
});
