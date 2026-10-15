import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { ENV_NAMES, SELECT_MODIFIER, openEnvironmentsList } from './helpers';

const [ENV_1, ENV_2, ENV_3, ENV_4] = ENV_NAMES;

test.describe('Collection environments sidebar menu multi-select', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openEnvironmentsList(page, electronApp, collectionFixturePath!);
    await expect(buildCommonLocators(page).environment.sidebarActions.rowNames()).toHaveText(ENV_NAMES);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Cmd/Ctrl-click adds the open environment to the selection', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { selectedRowNames } = environment.sidebarActions;

    await test.step('First Cmd/Ctrl-click selects the open environment and the clicked one', async () => {
      await environment.sidebarListItemExact('collection', ENV_3).click({ modifiers: [SELECT_MODIFIER] });
      await expect(selectedRowNames()).toHaveText([ENV_1, ENV_3]);
    });

    await test.step('Cmd/Ctrl-click on a selected row removes it', async () => {
      await environment.sidebarListItemExact('collection', ENV_3).click({ modifiers: [SELECT_MODIFIER] });
      await expect(selectedRowNames()).toHaveText([ENV_1]);
    });

    await test.step('Cmd/Ctrl-click on another row adds it', async () => {
      await environment.sidebarListItemExact('collection', ENV_4).click({ modifiers: [SELECT_MODIFIER] });
      await expect(selectedRowNames()).toHaveText([ENV_1, ENV_4]);
    });
  });

  test('Shift-click selects the range from the open environment', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { selectedRowNames } = environment.sidebarActions;

    await environment.sidebarListItemExact('collection', ENV_3).click({ modifiers: ['Shift'] });
    await expect(selectedRowNames()).toHaveText([ENV_1, ENV_2, ENV_3]);
  });

  test('Shift-click ranges start from the last clicked row', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { selectedRowNames } = environment.sidebarActions;

    await environment.sidebarListItemExact('collection', ENV_2).click({ modifiers: [SELECT_MODIFIER] });
    await environment.sidebarListItemExact('collection', ENV_4).click({ modifiers: ['Shift'] });

    await expect(selectedRowNames()).toHaveText([ENV_1, ENV_2, ENV_3, ENV_4]);
  });

  test('a plain click clears the selection and opens the clicked environment', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { selectedRows } = environment.sidebarActions;

    await environment.sidebarListItemExact('collection', ENV_3).click({ modifiers: [SELECT_MODIFIER] });
    await expect(selectedRows()).toHaveCount(2);

    await environment.sidebarListItemExact('collection', ENV_4).click();

    await expect(selectedRows()).toHaveCount(0);
    // aria-current marks the environment open in the editor
    await expect(environment.sidebarListItemExact('collection', ENV_4)).toHaveAttribute('aria-current', 'true');
  });

  test('the row menu button is hidden on rows that are part of the selection', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { rowMenuButton } = environment.sidebarActions;

    await expect(rowMenuButton(ENV_2)).toHaveCount(1);

    await environment.sidebarListItemExact('collection', ENV_3).click({ modifiers: [SELECT_MODIFIER] });

    // Env 1 and Env 3 are selected, so no menu.
    await expect(rowMenuButton(ENV_1)).toHaveCount(0);
    await expect(rowMenuButton(ENV_3)).toHaveCount(0);

    // Env 2 and Env 4 keep their menu.
    await expect(rowMenuButton(ENV_2)).toHaveCount(1);
    await expect(rowMenuButton(ENV_4)).toHaveCount(1);
  });

  test('Select all from the row menu selects only the environments matching the search', async ({ page }) => {
    const { environment } = buildCommonLocators(page);
    const { rows, searchInput, selectedRowNames, rowMenuButton, rowMenuItem } = environment.sidebarActions;

    await test.step('Filter the list to Env 4', async () => {
      await searchInput().fill('4');
      await expect(rows()).toHaveCount(1);
    });

    await test.step('Select all applies to the visible environments only', async () => {
      await rowMenuButton(ENV_4).click();
      await rowMenuItem('select-all').click();

      await searchInput().fill('');
      await expect(rows()).toHaveCount(ENV_NAMES.length);
      await expect(selectedRowNames()).toHaveText([ENV_4]);
    });
  });
});
