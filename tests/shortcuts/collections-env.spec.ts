import { expect, test } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  collectionName,
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

  test.describe('COLLECTIONS & ENVIRONMENTS', () => {
    test.describe('SHORTCUT: Import Collection', () => {
      test('default Cmd/Ctrl+O open import collection modal', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        console.log('1');
        await page.keyboard.press(`${modifier}+KeyO`);

        console.log('2');
        await expect(page.getByTestId('import-collection-modal')).toBeVisible({ timeout: 3000 });

        console.log('3');
        // Close the modal to leave a clean state for subsequent tests
        await page.getByTestId('modal-close-button').click();
        await expect(page.getByTestId('import-collection-modal')).not.toBeVisible({ timeout: 3000 });
        console.log('4');
      });

      test('customized Alt+O open import collection modal', async ({ page }) => {
        await page.keyboard.press(`${modifier}+KeyW`);

        console.log('1');
        // Remap importCollection to Alt+O
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-importCollection');
        await row.hover();
        await page.getByTestId('keybinding-edit-importCollection').click();
        await expect(page.getByTestId('keybinding-input-importCollection')).toBeVisible({ timeout: 2000 });

        console.log('2');
        await page.keyboard.down('Backspace');

        console.log('3');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyO');
        await page.keyboard.up('KeyO');
        await page.keyboard.up('Alt');

        console.log('4');
        await page.keyboard.press(`${modifier}+KeyW`);

        console.log('5');
        // Trigger the remapped shortcut
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyO');
        await page.keyboard.up('KeyO');
        await page.keyboard.up('Alt');

        console.log('6');
        await expect(page.getByTestId('import-collection-modal')).toBeVisible({ timeout: 3000 });

        console.log('7');
        // Close the modal to leave a clean state for subsequent tests
        await page.getByTestId('modal-close-button').click();
        await expect(page.getByTestId('import-collection-modal')).not.toBeVisible({ timeout: 3000 });

        console.log('8');
        // Reset Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
        console.log('9');
      });
    });

    test.describe('SHORTCUT: Edit Environment (Cmd/Ctrl+E)', () => {
      test('open environment tab of collection Cmd/Ctrl+E', async ({ page, createTmpDir }) => {
        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        console.log('1');
        await page.keyboard.down(modifier);
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up(modifier);

        console.log('2');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Environments', { exact: true }) })).toBeVisible({ timeout: 2000 });
        console.log('3');
      });

      test('open environment tab of collection customized Alt+E', async ({ page, createTmpDir }) => {
        // Remap editEnvironment to Alt+E
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-editEnvironment');
        await row.hover();
        await page.getByTestId('keybinding-edit-editEnvironment').click();
        await expect(page.getByTestId('keybinding-input-editEnvironment')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        console.log('3');
        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        console.log('4');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        console.log('5');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Environments', { exact: true }) })).toBeVisible({ timeout: 2000 });

        console.log('6');
        // Rest Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
        console.log('7');
      });
    });

    test.describe('SHORTCUT: Edit Environment (customized Alt+E)', () => {
      test('open environment tab of collection customized Alt+E', async ({ page, createTmpDir }) => {
        // Remap editEnvironment to Alt+E
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-editEnvironment');
        await row.hover();
        await page.getByTestId('keybinding-edit-editEnvironment').click();
        await expect(page.getByTestId('keybinding-input-editEnvironment')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        console.log('3');
        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        console.log('4');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        console.log('5');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Environments', { exact: true }) })).toBeVisible({ timeout: 2000 });

        console.log('6');
        // Rest Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
        console.log('7');
      });
    });

    test.describe('SHORTCUT: New Request', () => {
      test('default Cmd/Ctrl+N opens new request modal for collection', async ({ page }) => {
        // Focus the collection so the keybinding is active
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText(collectionName, { exact: true }) }).click();

        console.log('1');
        await page.keyboard.press(`${modifier}+KeyN`);

        console.log('2');
        await page.getByTestId('request-name').fill('nr-collection-cenv');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        console.log('3');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-collection-cenv', { exact: true }) })).toBeVisible({ timeout: 2000 });
        console.log('4');
      });

      test('default Cmd/Ctrl+N opens new request modal for folder', async ({ page }) => {
        // Focus the folder so the keybinding is active
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).click();

        console.log('1');
        await page.keyboard.press(`${modifier}+KeyN`);

        console.log('2');
        await page.getByTestId('request-name').fill('nr-folder-cenv');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        console.log('3');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-folder-cenv', { exact: true }) })).toBeVisible({ timeout: 2000 });
        console.log('4');
      });

      test('customized Alt+N opens new request modal for collection', async ({ page }) => {
        // Remap newRequest to Alt+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-newRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-newRequest').click();
        await expect(page.getByTestId('keybinding-input-newRequest')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        console.log('3');
        // Focus the collection so the keybinding is active
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText(collectionName, { exact: true }) }).click();

        console.log('4');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        console.log('5');
        await page.getByTestId('request-name').fill('nr-collection-cenv-altn');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        console.log('6');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-collection-cenv-altn', { exact: true }) })).toBeVisible({ timeout: 2000 });

        console.log('7');
        // Reset Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
        console.log('8');
      });

      test('customized Alt+N opens new request modal for folder', async ({ page }) => {
        // Remap newRequest to Alt+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-newRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-newRequest').click();
        await expect(page.getByTestId('keybinding-input-newRequest')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        console.log('3');
        // Focus the folder so the keybinding is active
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).click();

        console.log('4');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        console.log('5');
        await page.getByTestId('request-name').fill('nr-folder-cenv-altn');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        console.log('6');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-folder-cenv-altn', { exact: true }) })).toBeVisible({ timeout: 2000 });

        console.log('7');
        // Reset Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
        console.log('8');
      });
    });
  });
});
