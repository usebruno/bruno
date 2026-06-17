import { expect, test } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  modifier,
  openKeybindingsTab,
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

  test.describe('DEVELOPER TOOLS', () => {
    test.describe('SHORTCUT: Open Terminal (Cmd/Ctrl+T)', () => {
      test('default Cmd/Ctrl+T opens terminal', async ({ page, createTmpDir }) => {
        // Open Collection-Settings tab (double-click collection name)
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).click();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // console.log('1');
        // Press Cmd/Ctrl+T to open terminal at workspace level
        await page.keyboard.press(`${modifier}+KeyT`);

        // console.log('2');
        // Verify terminal session is visible using data-testid
        const collectionTerminalSession = page.getByTestId('session-list-0');
        await expect(collectionTerminalSession).toBeVisible({ timeout: 2000 });

        // console.log('3');
        const collectionSession = collectionTerminalSession;
        await expect(collectionSession).toContainText('kb-collection');
        await page.getByTitle('Close console').click();

        // console.log('4');
        // Open Folder-Settings tab (create folder + double-click)
        // Open folder settings
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-terminal-folder', { exact: true }) }).dblclick();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('kb-terminal-folder', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // console.log('5');
        await page.keyboard.press(`${modifier}+KeyT`);
        const folderTerminalSession = page.getByTestId('session-list-1');
        await expect(folderTerminalSession).toBeVisible({ timeout: 2000 });

        // console.log('6');
        // Verify the terminal session name is the workspace name (default_workspace)
        const folderSessionName = folderTerminalSession;
        await expect(folderSessionName).toContainText('kb-terminal-folder');

        // console.log('7');
        // Close all sessions with terminal tab
        await page.getByTestId('session-close-1').click();
        await page.waitForTimeout(1000);
        await page.getByTestId('session-close-0').click();
        await expect(page.getByTestId('session-close-0')).not.toBeVisible({ timeout: 3000 });
        await page.getByTitle('Close console').click();
        // console.log('8');
      });
    });

    test.describe('SHORTCUT: Open Terminal (customized Alt+T)', () => {
      test('customized Alt+T opens terminal', async ({ page, createTmpDir }) => {
        // Remap openTerminal to Alt+T
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-openTerminal');
        await row.hover();
        await page.getByTestId('keybinding-edit-openTerminal').click();
        await expect(page.getByTestId('keybinding-input-openTerminal')).toBeVisible({ timeout: 2000 });

        // console.log('1');
        await page.keyboard.down('Backspace');

        // console.log('2');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyT');
        await page.keyboard.up('KeyT');
        await page.keyboard.up('Alt');

        // console.log('3');
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).click();
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Collection', { exact: true }) })).toBeVisible({ timeout: 2000 });

        // console.log('4');
        // Press Cmd/Ctrl+T to open terminal at workspace level
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyT');
        await page.keyboard.up('KeyT');
        await page.keyboard.up('Alt');
        await page.waitForTimeout(500);

        // console.log('5');
        // Verify terminal session is visible using data-testid
        const collectionTerminalSession = page.getByTestId('session-list-0');
        await expect(collectionTerminalSession).toBeVisible({ timeout: 2000 });

        // console.log('6');
        const collectionSession = collectionTerminalSession;
        await expect(collectionSession).toContainText('kb-collection');

        // console.log('7');
        // Open folder settings
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-terminal-folder', { exact: true }) }).dblclick();

        // console.log('8');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyT');
        await page.keyboard.up('KeyT');
        await page.keyboard.up('Alt');
        const folderTerminalSession = page.getByTestId('session-list-1');
        await expect(folderTerminalSession).toBeVisible({ timeout: 2000 });

        // console.log('9');
        // Verify the terminal session name is the workspace name (default_workspace)
        const folderSessionName = folderTerminalSession;
        await expect(folderSessionName).toContainText('kb-terminal-folder');

        // console.log('10');
        // Close all sessions with terminal tab
        await page.getByTestId('session-close-1').click();
        await page.waitForTimeout(1000);
        await page.getByTestId('session-close-0').click();
        await expect(page.getByTestId('session-close-0')).not.toBeVisible({ timeout: 3000 });
        await page.getByTitle('Close console').click();
        // console.log('11');
      });
    });
  });
});
