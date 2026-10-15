import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { ENV_NAMES, ctrlClickRows, openEnvironmentsList, openRowContextMenu } from './helpers';

const [ENV_1, ENV_2, ENV_3, ENV_4] = ENV_NAMES;

test.describe('Collection environments context menu', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openEnvironmentsList(page, electronApp, collectionFixturePath!);
    await expect(buildCommonLocators(page).environment.sidebarActions.rowNames()).toHaveText(ENV_NAMES);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('right-clicking a row lists the single-environment actions without selecting it', async ({ page }) => {
    const { contextMenuItem, selectedRows } = buildCommonLocators(page).environment.sidebarActions;

    await openRowContextMenu(page, ENV_2);

    await expect(contextMenuItem('export')).toBeVisible();
    await expect(contextMenuItem('rename')).toBeVisible();
    await expect(contextMenuItem('duplicate')).toBeVisible();
    await expect(contextMenuItem('select-all')).toHaveText(/^Select all/);
    await expect(contextMenuItem('delete')).toHaveText(/^Delete(?! \()/);
    await expect(selectedRows()).toHaveCount(0);
  });

  test('right-clicking a multi-selection hides Rename and Duplicate and counts the selection', async ({ page }) => {
    const { contextMenuItem } = buildCommonLocators(page).environment.sidebarActions;

    await ctrlClickRows(page, [ENV_3]);
    await openRowContextMenu(page, ENV_3);

    await expect(contextMenuItem('export')).toBeVisible();
    await expect(contextMenuItem('select-all')).toBeVisible();
    await expect(contextMenuItem('rename')).toHaveCount(0);
    await expect(contextMenuItem('duplicate')).toHaveCount(0);
    await expect(contextMenuItem('delete')).toHaveText(/^Delete \(2\)/);
  });

  test('right-clicking a row outside the selection targets only that row', async ({ page }) => {
    const { contextMenuItem, selectedRows } = buildCommonLocators(page).environment.sidebarActions;

    await ctrlClickRows(page, [ENV_2]);
    await expect(selectedRows()).toHaveCount(2);

    await openRowContextMenu(page, ENV_4);

    await expect(contextMenuItem('rename')).toBeVisible();
    await expect(contextMenuItem('delete')).toHaveText(/^Delete(?! \()/);
    await expect(selectedRows()).toHaveCount(2);
  });

  test('Select all turns into Unselect all once every environment is selected', async ({ page }) => {
    const { contextMenuItem, selectedRows } = buildCommonLocators(page).environment.sidebarActions;

    await test.step('Select all', async () => {
      await openRowContextMenu(page, ENV_2);
      await expect(contextMenuItem('select-all')).toHaveText(/^Select all/);
      await contextMenuItem('select-all').click();

      await expect(selectedRows()).toHaveCount(ENV_NAMES.length);
    });

    await test.step('Unselect all', async () => {
      await openRowContextMenu(page, ENV_2);
      await expect(contextMenuItem('select-all')).toHaveText(/^Unselect all/);
      await contextMenuItem('select-all').click();

      await expect(selectedRows()).toHaveCount(0);
    });
  });

  test('Delete removes every selected environment', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { contextMenuItem, deleteModal, rowNames } = environment.sidebarActions;

    await test.step('Select Env 2, Env 3 and Env 4', async () => {
      await environment.sidebarListItemExact('collection', ENV_2).click();
      await ctrlClickRows(page, [ENV_3, ENV_4]);
    });

    await openRowContextMenu(page, ENV_3);
    await contextMenuItem('delete').click();

    await expect(deleteModal.confirm()).toHaveText('Delete (3)');
    await deleteModal.confirm().click();

    await expect(deleteModal.root()).toBeHidden();
    await expect(rowNames()).toHaveText([ENV_1]);
  });

  test('Export opens the export modal with every selected environment', async ({ page }) => {
    const { exportModal, sidebarActions } = buildCommonLocators(page).environment;

    await ctrlClickRows(page, [ENV_3]);
    await openRowContextMenu(page, ENV_3);
    await sidebarActions.contextMenuItem('export').click();

    await expect(exportModal.root()).toBeVisible();
    await expect(exportModal.environmentCheckbox(ENV_1)).toBeChecked();
    await expect(exportModal.environmentCheckbox(ENV_3)).toBeChecked();
    await expect(exportModal.environmentCheckbox(ENV_2)).toHaveCount(0);
    await expect(exportModal.submit()).toHaveText('Export 2 Environments');

    await page.keyboard.press('Escape');
    await expect(exportModal.root()).toBeHidden();
  });

  test('Rename clears the selection and edits the right-clicked environment', async ({ page }) => {
    const { contextMenuItem, selectedRows, rowRenameInput } = buildCommonLocators(page).environment.sidebarActions;

    await ctrlClickRows(page, [ENV_3]);
    await expect(selectedRows()).toHaveCount(2);

    await openRowContextMenu(page, ENV_2);
    await contextMenuItem('rename').click();

    await expect(rowRenameInput()).toHaveValue(ENV_2);
    await expect(selectedRows()).toHaveCount(0);
  });
});
