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

  test.describe('OTHERS', () => {
    test.describe('SHORTCUT: Open Preferences', () => {
      test('default Cmd/Ctrl+, open preferences', async ({ page }) => {
        await page.keyboard.down(modifier);
        await page.keyboard.down('Comma');
        await page.keyboard.up('Comma');
        await page.keyboard.up(modifier);

        console.log('1');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Preferences', { exact: true }) })).toBeVisible({ timeout: 3000 });
        console.log('2');
      });
    });

    test.describe('SHORTCUT: Open Preferences (customized Cmd/Ctrl+P)', () => {
      test('customized Cmd/Ctrl+P open preferences', async ({ page }) => {
        // Remap openPreferences to Ctrl+P
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-openPreferences');
        await row.hover();
        await page.getByTestId('keybinding-edit-openPreferences').click();
        await expect(page.getByTestId('keybinding-input-openPreferences')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down(modifier);
        await page.keyboard.down('KeyP');
        await page.keyboard.up('KeyP');
        await page.keyboard.up(modifier);

        console.log('3');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('Preferences', { exact: true }) })).toBeVisible({ timeout: 3000 });
        console.log('4');
      });
    });
  });
});
