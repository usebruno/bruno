import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { ENV_NAMES, openEnvironmentsList } from './helpers';
import { DELETE_KEY, IS_MAC, SELECT_ALL_KEY, clickEmptyListSpace, ctrlClickRows, openRowContextMenu } from '../../utils/page/environments';

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
    // macOS renders the Delete hint as icons, so its text is only checked on the other platforms.
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

  test('Cmd/Ctrl+A with the context menu open selects every environment and closes the menu', async ({ page }) => {
    const { contextMenu, selectedRowNames } = buildCommonLocators(page).environment.sidebarActions;

    await openRowContextMenu(page, ENV_2);
    await page.keyboard.press(SELECT_ALL_KEY);

    await expect(contextMenu()).toBeHidden();
    await expect(selectedRowNames()).toHaveText(ENV_NAMES);
  });

  test('Cmd/Ctrl+A with the row menu open selects every environment and closes the menu', async ({ page }) => {
    const { rowMenuButton, rowMenuItem, selectedRowNames } = buildCommonLocators(page).environment.sidebarActions;

    await rowMenuButton(ENV_2).click();
    await expect(rowMenuItem('select-all')).toBeVisible();
    await page.keyboard.press(SELECT_ALL_KEY);

    await expect(rowMenuItem('select-all')).toBeHidden();
    await expect(selectedRowNames()).toHaveText(ENV_NAMES);
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

  test('the delete key deletes the open environment, or every selected environment', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { deleteModal, rowNames } = environment.sidebarActions;

    await test.step('With nothing selected, the delete key targets the open environment', async () => {
      await environment.sidebarListItemExact('collection', ENV_2).click();
      await page.keyboard.press(DELETE_KEY);

      await expect(deleteModal.root()).toContainText(ENV_2);
      await expect(deleteModal.confirm()).toHaveText('Delete');

      await page.keyboard.press('Escape');
      await expect(deleteModal.root()).toBeHidden();
    });

    await test.step('With Env 2 and Env 3 selected, the delete modal opens', async () => {
      await ctrlClickRows(page, [ENV_2, ENV_3]);
      await page.keyboard.press(DELETE_KEY);

      await expect(deleteModal.confirm()).toHaveText('Delete (2)');
    });

    await test.step('Confirming removes the selected environments', async () => {
      await deleteModal.confirm().click();

      await expect(deleteModal.root()).toBeHidden();
      await expect(rowNames()).toHaveText([ENV_1, ENV_4]);
    });
  });

  test('the delete key does nothing when the search hides the open environment', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { deleteModal, rowNames, searchInput } = environment.sidebarActions;

    await environment.sidebarListItemExact('collection', ENV_2).click();

    await test.step('Search for another environment, so the open one is hidden', async () => {
      await searchInput().fill('3');
      await expect(rowNames()).toHaveText([ENV_3]);
    });

    await test.step('The delete key with the list focused opens no modal', async () => {
      await clickEmptyListSpace(page);
      await page.keyboard.press(DELETE_KEY);
      await expect(deleteModal.root()).toBeHidden();
    });

    await test.step('Clearing the search shows the open environment again, so the delete key targets it', async () => {
      await searchInput().fill('');
      await expect(rowNames()).toHaveText(ENV_NAMES);
      await clickEmptyListSpace(page);
      await page.keyboard.press(DELETE_KEY);
      await expect(deleteModal.root()).toContainText(ENV_2);
    });
  });

  test('the delete key with the context menu open deletes the right-clicked environment, not the selection', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { deleteModal, rowNames, selectedRowNames } = environment.sidebarActions;

    await ctrlClickRows(page, [ENV_1, ENV_2]);
    await expect(selectedRowNames()).toHaveText([ENV_1, ENV_2]);

    await openRowContextMenu(page, ENV_4);
    await page.keyboard.press(DELETE_KEY);
    await expect(deleteModal.root()).toBeVisible();

    await deleteModal.confirm().click();

    await expect(deleteModal.root()).toBeHidden();
    await expect(rowNames()).toHaveText([ENV_1, ENV_2, ENV_3]);
  });

  test('the delete key with the row menu open deletes that row, not the selection', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { deleteModal, rowMenuButton, rowNames, selectedRowNames } = environment.sidebarActions;

    await ctrlClickRows(page, [ENV_1, ENV_2]);
    await expect(selectedRowNames()).toHaveText([ENV_1, ENV_2]);

    await rowMenuButton(ENV_4).click();
    await page.keyboard.press(DELETE_KEY);
    await expect(deleteModal.root()).toBeVisible();

    await deleteModal.confirm().click();

    await expect(deleteModal.root()).toBeHidden();
    await expect(rowNames()).toHaveText([ENV_1, ENV_2, ENV_3]);
  });

  test('the shortcuts work again after the delete modal is closed with Escape', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { deleteModal, selectedRowNames } = environment.sidebarActions;

    await ctrlClickRows(page, [ENV_2, ENV_3]);
    await page.keyboard.press(DELETE_KEY);
    await expect(deleteModal.root()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(deleteModal.root()).toBeHidden();

    // Focus is back in the list, so select all still works.
    await page.keyboard.press(SELECT_ALL_KEY);
    await expect(selectedRowNames()).toHaveText(ENV_NAMES);
  });

  test('Escape clears the selection', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { selectedRows } = environment.sidebarActions;

    await ctrlClickRows(page, [ENV_2, ENV_3]);
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

    await ctrlClickRows(page, [ENV_2, ENV_3]);
    await page.keyboard.press(DELETE_KEY);
    await expect(deleteModal.root()).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(deleteModal.root()).toBeHidden();
    await expect(selectedRows()).toHaveCount(2);
  });

  test('Escape closes the context menu and keeps the selection', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { contextMenu, selectedRows } = environment.sidebarActions;

    await ctrlClickRows(page, [ENV_2, ENV_3]);
    await openRowContextMenu(page, ENV_3);

    await page.keyboard.press('Escape');

    await expect(contextMenu()).toBeHidden();
    await expect(selectedRows()).toHaveCount(2);
  });
});
