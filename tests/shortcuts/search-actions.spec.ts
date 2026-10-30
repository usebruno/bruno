import { expect, test } from '../../playwright';
import { buildCommonLocators, closeAllCollections, createRequest } from '../utils/page';
import {
  closeGlobalSearch,
  closePreferencesTab,
  collectionName,
  modifier,
  openKeybindingsTab,
  pressShortcut,
  remapKeybinding,
  resetKeybindings,
  setKeybindingsEnabled,
  setupBoundActionsData
} from './helpers';

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor(); ;
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await setKeybindingsEnabled(page, true);
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

    test.describe('Status bar Search button', () => {
      test('opens Global Search after the shortcut is remapped', async ({ pageWithUserData: page }) => {
        const locators = buildCommonLocators(page);
        await remapKeybinding(page, 'globalSearch', 'Shift', 'KeyK');

        await locators.statusBarGlobalSearch().click();

        await expect(locators.globalSearch.input()).toBeVisible();
        await closeGlobalSearch(page);
      });

      test('opens Global Search, not the action now bound to the default shortcut', async ({ pageWithUserData: page }) => {
        const locators = buildCommonLocators(page);
        await remapKeybinding(page, 'globalSearch', 'Shift', 'KeyK');
        await remapKeybinding(page, 'editEnvironment', modifier, 'KeyK');
        const environmentTabs = await locators.tabs.requestTab('Environments').count();

        await locators.statusBarGlobalSearch().click();

        await expect(locators.globalSearch.input()).toBeVisible();
        await closeGlobalSearch(page);
        await expect(locators.tabs.requestTab('Environments')).toHaveCount(environmentTabs);
      });

      test('opens Global Search while keyboard shortcuts are turned off', async ({ pageWithUserData: page }) => {
        const locators = buildCommonLocators(page);
        await setKeybindingsEnabled(page, false);

        await locators.statusBarGlobalSearch().click();

        await expect(locators.globalSearch.input()).toBeVisible();
        await closeGlobalSearch(page);
      });
    });

    test.describe('Global Search results', () => {
      test('selecting a request result opens it, and selecting it again focuses the existing tab', async ({
        pageWithUserData: page
      }) => {
        const locators = buildCommonLocators(page);
        const requestName = 'kb-search-target';
        await createRequest(page, requestName, collectionName, { url: 'https://echo.usebruno.com', method: 'GET' });
        const searchAndSelect = async () => {
          await pressShortcut(page, modifier, 'KeyK');
          const input = page.getByTestId('global-search-input');
          await expect(input).toBeVisible();
          await input.fill(requestName);
          const result = page.getByRole('option', { name: new RegExp(`^${requestName},`) });
          await expect(result).toBeVisible();
          await result.click();
          await expect(input).toBeHidden();
        };

        await test.step('With the request tab closed, selecting the result opens it', async () => {
          if (await locators.tabs.closeTab(requestName).count()) {
            await locators.tabs.closeTab(requestName).click({ force: true });
          }
          await expect(locators.tabs.requestTab(requestName)).toHaveCount(0);
          await searchAndSelect();
          await expect(locators.tabs.activeRequestTab()).toContainText(requestName);
        });

        await test.step('Selecting the same result again focuses the existing tab', async () => {
          await searchAndSelect();
          await expect(locators.tabs.activeRequestTab()).toContainText(requestName);
          await expect(locators.tabs.requestTab(requestName)).toHaveCount(1);
        });
      });
    });
  });
});
