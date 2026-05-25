import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import {
  modifier,
  setupBoundActionsData,
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

  test.describe('SEARCH', () => {
    test.describe('SHORTCUT: Global Search (Cmd/Ctrl+K)', () => {
      test('default Cmd/Ctrl+K Global Search Modal', async ({ page, createTmpDir }) => {
        await page.keyboard.down(modifier);
        await page.keyboard.down('KeyK');
        await page.keyboard.up('KeyK');
        await page.keyboard.up(modifier);

        await page.getByTestId('global-search-input').click();
        await expect(page.getByTestId('global-search-input')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Escape');
        await page.keyboard.up('Escape');
      });

      test('customized Alt+K Global Search Modal', async ({ page, createTmpDir }) => {
        // Remap globalSearch to Alt+K
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-globalSearch');
        await row.hover();
        await page.getByTestId('keybinding-edit-globalSearch').click();
        await expect(page.getByTestId('keybinding-input-globalSearch')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyK');
        await page.keyboard.up('KeyK');
        await page.keyboard.up('Alt');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyK');
        await page.keyboard.up('KeyK');
        await page.keyboard.up('Alt');

        await page.getByTestId('global-search-input').click();
        await expect(page.getByTestId('global-search-input')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Escape');
        await page.keyboard.up('Escape');
      });
    });
  });
});
