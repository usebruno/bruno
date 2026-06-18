import { expect, test } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  closePreferencesTab,
  modifier,
  openKeybindingsTab,
  setupBoundActionsData
} from './helpers';

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 5000 });
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test.describe('SEARCH', () => {
    test.describe('SHORTCUT: Global Search (Cmd/Ctrl+K)', () => {
      test('default Cmd/Ctrl+K Global Search Modal', async ({ pageWithUserData: page }) => {
        await page.keyboard.down(modifier);
        await page.keyboard.down('KeyK');
        await page.keyboard.up('KeyK');
        await page.keyboard.up(modifier);

        await expect(page.getByTestId('global-search-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('global-search-input').click();

        await page.keyboard.down('Escape');
        await page.keyboard.up('Escape');
      });

      test('customized Shift+K Global Search Modal', async ({ pageWithUserData: page }) => {
        // Remap globalSearch to Shift+K
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-globalSearch');
        await row.hover();
        await page.getByTestId('keybinding-edit-globalSearch').click();
        await expect(page.getByTestId('keybinding-input-globalSearch')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyK');
        await page.keyboard.up('KeyK');
        await page.keyboard.up('Shift');

        await closePreferencesTab(page);

        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyK');
        await page.keyboard.up('KeyK');
        await page.keyboard.up('Shift');

        await expect(page.getByTestId('global-search-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('global-search-input').click();

        await page.keyboard.down('Escape');
        await page.keyboard.up('Escape');
      });
    });
  });
});
