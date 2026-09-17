import { expect, test } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  closePreferencesTab,
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

  test.describe('SEARCH', () => {
    test.describe('SHORTCUT: Global Search (Cmd/Ctrl+K)', () => {
      test('default Cmd/Ctrl+K Global Search Modal', async ({ pageWithUserData: page }) => {
        await pressShortcut(page, modifier, 'KeyK');

        await expect(page.getByTestId('global-search-input')).toBeVisible();
        await page.getByTestId('global-search-input').click();

        await pressShortcut(page, 'Escape');
      });

      test('customized Shift+K Global Search Modal', async ({ pageWithUserData: page }) => {
        // Remap globalSearch to Shift+K
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-globalSearch');
        await row.hover();
        await page.getByTestId('keybinding-edit-globalSearch').click();
        await expect(page.getByTestId('keybinding-input-globalSearch')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Shift', 'KeyK');

        await closePreferencesTab(page);

        await pressShortcut(page, 'Shift', 'KeyK');

        await expect(page.getByTestId('global-search-input')).toBeVisible();
        await page.getByTestId('global-search-input').click();

        await pressShortcut(page, 'Escape');
      });
    });
  });
});
