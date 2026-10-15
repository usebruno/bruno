import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  DELETE_KEY,
  ENV_NAMES,
  IS_MAC,
  SELECT_ALL_KEY,
  ctrlClickRows,
  openEnvironmentsList,
  openRowContextMenu
} from './helpers';

const [ENV_1, ENV_2, ENV_3, ENV_4] = ENV_NAMES;

test.describe('Collection environments list shortcuts', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openEnvironmentsList(page, electronApp, collectionFixturePath!);
    await expect(buildCommonLocators(page).environment.sidebarActions.rowNames()).toHaveText(ENV_NAMES);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('the row menu shows the Select all and Delete shortcut hints', async ({ page }) => {
    const { rowMenuButton, rowMenuShortcut } = buildCommonLocators(page).environment.sidebarActions;

    await rowMenuButton(ENV_2).click();

    await expect(rowMenuShortcut('select-all')).toBeVisible();
    await expect(rowMenuShortcut('delete')).toBeVisible();
    // macOS renders the Delete hint as icons, so its text is only checked elsewhere.
    if (!IS_MAC) {
      await expect(rowMenuShortcut('delete')).toHaveText('Del');
    }
  });

  test('the context menu shows the Select all and Delete shortcut hints', async ({ page }) => {
    const { contextMenuShortcut } = buildCommonLocators(page).environment.sidebarActions;

    await openRowContextMenu(page, ENV_2);

    await expect(contextMenuShortcut('select-all')).toBeVisible();
    await expect(contextMenuShortcut('delete')).toBeVisible();
    if (!IS_MAC) {
      await expect(contextMenuShortcut('delete')).toHaveText('Del');
    }
  });

  test('Cmd/Ctrl+A selects every environment and pressing it again clears the selection', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { selectedRows, selectedRowNames } = environment.sidebarActions;

    await environment.sidebarListItemExact('collection', ENV_2).click();

    await page.keyboard.press(SELECT_ALL_KEY);
    await expect(selectedRowNames()).toHaveText(ENV_NAMES);

    await page.keyboard.press(SELECT_ALL_KEY);
    await expect(selectedRows()).toHaveCount(0);
  });

  test('the delete key needs a selection and then deletes every selected environment', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { deleteModal, rowNames } = environment.sidebarActions;

    await test.step('Nothing is selected, so nothing happens', async () => {
      await environment.sidebarListItemExact('collection', ENV_2).click();
      await page.keyboard.press(DELETE_KEY);

      await expect(deleteModal.root()).toHaveCount(0);
    });

    await test.step('With Env 2 and Env 3 selected, the delete modal opens', async () => {
      await ctrlClickRows(page, [ENV_3]);
      await page.keyboard.press(DELETE_KEY);

      await expect(deleteModal.confirm()).toHaveText('Delete (2)');
    });

    await test.step('Confirming removes the selected environments', async () => {
      await deleteModal.confirm().click();

      await expect(deleteModal.root()).toBeHidden();
      await expect(rowNames()).toHaveText([ENV_1, ENV_4]);
    });
  });

  test('Escape clears the selection', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { selectedRows } = environment.sidebarActions;

    await environment.sidebarListItemExact('collection', ENV_2).click();
    await ctrlClickRows(page, [ENV_3]);
    await expect(selectedRows()).toHaveCount(2);

    await page.keyboard.press('Escape');

    await expect(selectedRows()).toHaveCount(0);
  });

  test('the shortcuts do nothing while the search box is focused', async ({ page }) => {
    const { searchInput, selectedRows } = buildCommonLocators(page).environment.sidebarActions;

    await searchInput().click();
    await page.keyboard.press(SELECT_ALL_KEY);

    await expect(selectedRows()).toHaveCount(0);
  });

  test('the shortcuts do nothing while an environment is being renamed', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { rowRenameInput, selectedRows } = environment.sidebarActions;

    await environment.sidebarListItemExact('collection', ENV_2).dblclick();
    await rowRenameInput().click();
    await page.keyboard.press(SELECT_ALL_KEY);

    await expect(selectedRows()).toHaveCount(0);
    await expect(rowRenameInput()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(rowRenameInput()).toBeHidden();
  });

  test('Escape closes the delete modal and keeps the selection', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { deleteModal, selectedRows } = environment.sidebarActions;

    await environment.sidebarListItemExact('collection', ENV_2).click();
    await ctrlClickRows(page, [ENV_3]);
    await page.keyboard.press(DELETE_KEY);
    await expect(deleteModal.root()).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(deleteModal.root()).toBeHidden();
    await expect(selectedRows()).toHaveCount(2);
  });

  test('Escape closes the context menu and keeps the selection', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { contextMenu, selectedRows } = environment.sidebarActions;

    await environment.sidebarListItemExact('collection', ENV_2).click();
    await ctrlClickRows(page, [ENV_3]);
    await openRowContextMenu(page, ENV_3);

    await page.keyboard.press('Escape');

    await expect(contextMenu()).toBeHidden();
    await expect(selectedRows()).toHaveCount(2);
  });
});
