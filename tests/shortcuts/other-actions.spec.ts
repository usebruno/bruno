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

  test.describe('OTHERS', () => {
    test.describe('SHORTCUT: Open Preferences', () => {
      test('default Cmd/Ctrl+, open preferences', async ({ pageWithUserData: page }) => {
        await pressShortcut(page, modifier, 'Comma');

        await expect(page.locator('.request-tab').filter({ has: page.getByText('Preferences', { exact: true }) })).toBeVisible();
      });
    });

    test.describe('SHORTCUT: Open Preferences (customized Cmd/Ctrl+P)', () => {
      test('customized Cmd/Ctrl+P open preferences', async ({ pageWithUserData: page }) => {
        // Remap openPreferences to Ctrl+P
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-openPreferences');
        await row.hover();
        await page.getByTestId('keybinding-edit-openPreferences').click();
        await expect(page.getByTestId('keybinding-input-openPreferences')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, modifier, 'KeyP');

        await expect(page.locator('.request-tab').filter({ has: page.getByText('Preferences', { exact: true }) })).toBeVisible();
      });
    });
  });
});
