import { expect, test } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  closePreferencesTab,
  collectionName,
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

  test.describe('COLLECTIONS & ENVIRONMENTS', () => {
    test.describe('SHORTCUT: Import Collection', () => {
      test('default Cmd/Ctrl+O open import collection modal', async ({ pageWithUserData: page }) => {
        await pressShortcut(page, modifier, 'KeyO');

        await expect(page.getByTestId('import-collection-modal')).toBeVisible();

        // Close the modal to leave a clean state for subsequent tests
        await page.getByTestId('modal-close-button').click();
        await expect(page.getByTestId('import-collection-modal')).not.toBeVisible();
      });

      test('customized Alt+O open import collection modal', async ({ pageWithUserData: page }) => {
        await pressShortcut(page, modifier, 'KeyW');

        // Remap importCollection to Alt+O
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-importCollection');
        await row.hover();
        await page.getByTestId('keybinding-edit-importCollection').click();
        await expect(page.getByTestId('keybinding-input-importCollection')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyO');

        await closePreferencesTab(page);

        // Trigger the remapped shortcut
        await pressShortcut(page, 'Alt', 'KeyO');

        await expect(page.getByTestId('import-collection-modal')).toBeVisible();

        // Close the modal to leave a clean state for subsequent tests
        await page.getByTestId('modal-close-button').click();
        await expect(page.getByTestId('import-collection-modal')).not.toBeVisible();
      });
    });

    test.describe('SHORTCUT: Edit Environment (Cmd/Ctrl+E)', () => {
      test('open environment tab of collection Cmd/Ctrl+E', async ({ pageWithUserData: page }) => {
        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        await pressShortcut(page, modifier, 'KeyE');

        await expect(page.locator('.request-tab').filter({ has: page.getByText('Environments', { exact: true }) })).toBeVisible();
      });

      test('open environment tab of collection customized Alt+E', async ({ pageWithUserData: page }) => {
        // Remap editEnvironment to Alt+E
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-editEnvironment');
        await row.hover();
        await page.getByTestId('keybinding-edit-editEnvironment').click();
        await expect(page.getByTestId('keybinding-input-editEnvironment')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyE');

        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        await pressShortcut(page, 'Alt', 'KeyE');

        await expect(page.locator('.request-tab').filter({ has: page.getByText('Environments', { exact: true }) })).toBeVisible();
      });
    });

    test.describe('SHORTCUT: New Request', () => {
      test('default Cmd/Ctrl+N opens new request modal for collection', async ({ pageWithUserData: page }) => {
        // Focus the collection so the keybinding is active
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText(collectionName, { exact: true }) }).click();

        await pressShortcut(page, modifier, 'KeyN');

        await page.getByTestId('request-name').fill('nr-collection-cenv');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-collection-cenv', { exact: true }) })).toBeVisible();
      });

      test('default Cmd/Ctrl+N opens new request modal for folder', async ({ pageWithUserData: page }) => {
        // Focus the folder so the keybinding is active
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).click();

        await pressShortcut(page, modifier, 'KeyN');

        await page.getByTestId('request-name').fill('nr-folder-cenv');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-folder-cenv', { exact: true }) })).toBeVisible();
      });

      test('customized Alt+N opens new request modal for collection', async ({ pageWithUserData: page }) => {
        // Remap newRequest to Alt+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-newRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-newRequest').click();
        await expect(page.getByTestId('keybinding-input-newRequest')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyN');

        // Focus the collection so the keybinding is active
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText(collectionName, { exact: true }) }).click();

        await pressShortcut(page, 'Alt', 'KeyN');

        await page.getByTestId('request-name').fill('nr-collection-cenv-altn');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-collection-cenv-altn', { exact: true }) })).toBeVisible();
      });

      test('customized Alt+N opens new request modal for folder', async ({ pageWithUserData: page }) => {
        // Remap newRequest to Alt+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-newRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-newRequest').click();
        await expect(page.getByTestId('keybinding-input-newRequest')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyN');

        // Focus the folder so the keybinding is active
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).click();

        await pressShortcut(page, 'Alt', 'KeyN');

        await page.getByTestId('request-name').fill('nr-folder-cenv-altn');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-folder-cenv-altn', { exact: true }) })).toBeVisible();
      });
    });
  });
});
