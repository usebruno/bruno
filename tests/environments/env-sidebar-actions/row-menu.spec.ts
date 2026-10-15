import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { ENV_NAMES, openEnvironmentsList } from './helpers';

const [ENV_1, ENV_2, ENV_3, ENV_4] = ENV_NAMES;

test.describe('Collection environments row menu', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openEnvironmentsList(page, electronApp, collectionFixturePath!);
    await expect(buildCommonLocators(page).environment.sidebarActions.rowNames()).toHaveText(ENV_NAMES);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('lists the actions for a single environment', async ({ page }) => {
    const { rowMenuButton, rowMenuItem } = buildCommonLocators(page).environment.sidebarActions;

    await rowMenuButton(ENV_2).click();

    await expect(rowMenuItem('export')).toBeVisible();
    await expect(rowMenuItem('rename')).toBeVisible();
    await expect(rowMenuItem('duplicate')).toBeVisible();
    await expect(rowMenuItem('select-all')).toHaveText(/^Select all/);
    await expect(rowMenuItem('delete')).toHaveText(/^Delete(?! \()/);
  });

  test('rename edits the environment name inline', async ({ page }) => {
    const { sidebarActions } = buildCommonLocators(page).environment;
    const renamed = `${ENV_2} renamed`;

    await sidebarActions.rowMenuButton(ENV_2).click();
    await sidebarActions.rowMenuItem('rename').click();

    await expect(sidebarActions.rowRenameInput()).toHaveValue(ENV_2);
    await sidebarActions.rowRenameInput().fill(renamed);
    await sidebarActions.rowRenameInput().press('Enter');

    await expect(sidebarActions.rowRenameInput()).toBeHidden();
    await expect(sidebarActions.rowNames()).toHaveText([ENV_1, renamed, ENV_3, ENV_4]);
  });

  test('duplicate creates a copy of the environment', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { rows, rowMenuButton, rowMenuItem, copyModal } = environment.sidebarActions;
    const copyName = `${ENV_2} - Copy`;

    await rowMenuButton(ENV_2).click();
    await rowMenuItem('duplicate').click();

    await expect(copyModal.root()).toBeVisible();
    await expect(copyModal.nameInput()).toHaveValue(copyName);

    await copyModal.submit().click();

    await expect(copyModal.root()).toBeHidden();
    await expect(environment.sidebarListItemExact('collection', copyName)).toBeVisible();
    await expect(rows()).toHaveCount(ENV_NAMES.length + 1);
  });

  test('delete removes the environment after confirmation', async ({ page }) => {
    const { rowMenuButton, rowMenuItem, rowNames, deleteModal } = buildCommonLocators(page).environment.sidebarActions;

    await rowMenuButton(ENV_2).click();
    await rowMenuItem('delete').click();

    await expect(deleteModal.root()).toBeVisible();
    await expect(deleteModal.activeWarning()).toBeHidden();

    await deleteModal.confirm().click();

    await expect(deleteModal.root()).toBeHidden();
    await expect(rowNames()).toHaveText([ENV_1, ENV_3, ENV_4]);
  });

  test('delete warns when the environment is the active one', async ({ page }) => {
    const { rowActivateButton, rowMenuButton, rowMenuItem, rowNames, deleteModal } = buildCommonLocators(page).environment.sidebarActions;

    await test.step('Activate Env 3', async () => {
      await rowActivateButton(ENV_3).click();
    });

    await test.step('Delete it and see the warning', async () => {
      await rowMenuButton(ENV_3).click();
      await rowMenuItem('delete').click();

      await expect(deleteModal.activeWarning()).toContainText(ENV_3);
    });

    await test.step('Confirm the delete', async () => {
      await deleteModal.confirm().click();

      await expect(deleteModal.root()).toBeHidden();
      await expect(rowNames()).toHaveText([ENV_1, ENV_2, ENV_4]);
    });
  });

  test('export opens the export modal for that environment only', async ({ page }) => {
    const { exportModal } = buildCommonLocators(page).environment;
    const { rowMenuButton, rowMenuItem } = buildCommonLocators(page).environment.sidebarActions;

    await rowMenuButton(ENV_2).click();
    await rowMenuItem('export').click();

    await expect(exportModal.root()).toBeVisible();
    await expect(exportModal.environmentCheckbox(ENV_2)).toBeChecked();
    await expect(exportModal.submit()).toHaveText('Export 1 Environment');

    await page.keyboard.press('Escape');
    await expect(exportModal.root()).toBeHidden();
  });
});
