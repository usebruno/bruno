import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  modifier,
  collectionName,
  setupBoundActionsData,
  openRequest,
  openKeybindingsTab
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

  test.describe('COLLECTIONS & ENVIRONMENTS', () => {
    test.describe('SHORTCUT: Import Collection', () => {
      test('default Cmd/Ctrl+O open import collection modal', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.keyboard.press(`${modifier}+KeyO`);

        await expect(page.getByTestId('import-collection-modal')).toBeVisible({ timeout: 3000 });

        // Close the modal to leave a clean state for subsequent tests
        await page.getByTestId('modal-close-button').click();
        await expect(page.getByTestId('import-collection-modal')).not.toBeVisible({ timeout: 3000 });
      });

      test('customized Alt+O open import collection modal', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap importCollection to Alt+O
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-importCollection');
        await row.hover();
        await page.getByTestId('keybinding-edit-importCollection').click();
        await expect(page.getByTestId('keybinding-input-importCollection')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyO');
        await page.keyboard.up('KeyO');
        await page.keyboard.up('Alt');

        // Trigger the remapped shortcut
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyO');
        await page.keyboard.up('KeyO');
        await page.keyboard.up('Alt');

        await expect(page.getByTestId('import-collection-modal')).toBeVisible({ timeout: 3000 });

        // Close the modal to leave a clean state for subsequent tests
        await page.getByTestId('modal-close-button').click();
        await expect(page.getByTestId('import-collection-modal')).not.toBeVisible({ timeout: 3000 });

        // Reset Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: Edit Environment (Cmd/Ctrl+E)', () => {
      test('open environment tab of collection Cmd/Ctrl+E', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        await page.keyboard.down(modifier);
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up(modifier);

        await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible({ timeout: 2000 });
      });

      test('open environment tab of collection customized Alt+E', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap editEnvironment to Alt+E
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-editEnvironment');
        await row.hover();
        await page.getByTestId('keybinding-edit-editEnvironment').click();
        await expect(page.getByTestId('keybinding-input-editEnvironment')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible({ timeout: 2000 });

        // Rest Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: Edit Environment (customized Alt+E)', () => {
      test('open environment tab of collection customized Alt+E', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap editEnvironment to Alt+E
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-editEnvironment');
        await row.hover();
        await page.getByTestId('keybinding-edit-editEnvironment').click();
        await expect(page.getByTestId('keybinding-input-editEnvironment')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible({ timeout: 2000 });

        // Rest Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: New Request', () => {
      test('default Cmd/Ctrl+N opens new request modal for collection', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Focus the collection so the keybinding is active
        await page.locator('.collection-name').filter({ hasText: collectionName }).click();

        await page.keyboard.press(`${modifier}+KeyN`);

        await page.getByTestId('request-name').fill('nr-collection-cenv');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-collection-cenv' })).toBeVisible({ timeout: 2000 });
      });

      test('default Cmd/Ctrl+N opens new request modal for folder', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Focus the folder so the keybinding is active
        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).click();

        await page.keyboard.press(`${modifier}+KeyN`);

        await page.getByTestId('request-name').fill('nr-folder-cenv');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-folder-cenv' })).toBeVisible({ timeout: 2000 });
      });

      test('customized Alt+N opens new request modal for collection', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

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

        // Focus the collection so the keybinding is active
        await page.locator('.collection-name').filter({ hasText: collectionName }).click();

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        await page.getByTestId('request-name').fill('nr-collection-cenv-altn');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-collection-cenv-altn' })).toBeVisible({ timeout: 2000 });

        // Reset Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });

      test('customized Alt+N opens new request modal for folder', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

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

        // Focus the folder so the keybinding is active
        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).click();

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        await page.getByTestId('request-name').fill('nr-folder-cenv-altn');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-folder-cenv-altn' })).toBeVisible({ timeout: 2000 });

        // Reset Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });
    });
  });
});
