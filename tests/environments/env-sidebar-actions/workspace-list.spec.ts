import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { ENV_NAMES, openWorkspaceEnvironments } from './helpers';
import {
  DELETE_KEY,
  SELECT_ALL_KEY,
  clickEmptyListSpace,
  ctrlClickRows,
  deleteAllWorkspaceEnvironments,
  openRowContextMenu
} from '../../utils/page/environments';

const [ENV_1, ENV_2, ENV_3, ENV_4] = ENV_NAMES;

test.describe('Workspace environments list', () => {
  test.beforeEach(async ({ page }) => {
    await openWorkspaceEnvironments(page);

    const { environment } = buildCommonLocators(page);
    await expect(environment.workspaceSidebarActions.rowNames()).toHaveText(ENV_NAMES);
    // aria-current marks the environment open in the editor
    await expect(environment.sidebarListItemExact('global', ENV_1)).toHaveAttribute('aria-current', 'true');
  });

  test.afterEach(async ({ page }) => {
    await deleteAllWorkspaceEnvironments(page);
  });

  test.describe('multi-select', () => {
    test('Cmd/Ctrl-click toggles rows in the selection without selecting the open environment', async ({ page }) => {
      const { selectedRowNames } = buildCommonLocators(page).environment.workspaceSidebarActions;

      await ctrlClickRows(page, [ENV_3], 'global');
      await expect(selectedRowNames()).toHaveText([ENV_3]);

      await ctrlClickRows(page, [ENV_4], 'global');
      await expect(selectedRowNames()).toHaveText([ENV_3, ENV_4]);

      await ctrlClickRows(page, [ENV_3], 'global');
      await expect(selectedRowNames()).toHaveText([ENV_4]);
    });

    test('a click on the empty space below the rows clears the selection', async ({ page }) => {
      const { selectedRows } = buildCommonLocators(page).environment.workspaceSidebarActions;

      await ctrlClickRows(page, [ENV_1, ENV_3], 'global');
      await expect(selectedRows()).toHaveCount(2);

      await clickEmptyListSpace(page, 'global');

      await expect(selectedRows()).toHaveCount(0);
    });

    test('Shift-click selects the range from the open environment', async ({ page }) => {
      const { environment } = buildCommonLocators(page);

      await environment.sidebarListItemExact('global', ENV_3).click({ modifiers: ['Shift'] });

      await expect(environment.workspaceSidebarActions.selectedRowNames()).toHaveText([ENV_1, ENV_2, ENV_3]);
    });

    test('a selection hidden by the search is kept but never acted on', async ({ page }) => {
      const { rowNames, searchInput, selectedRowNames, contextMenuItem, deleteModal }
        = buildCommonLocators(page).environment.workspaceSidebarActions;

      await ctrlClickRows(page, [ENV_1, ENV_2, ENV_3], 'global');
      await expect(selectedRowNames()).toHaveText([ENV_1, ENV_2, ENV_3]);

      await test.step('Searching hides Env 1 and Env 2, so only Env 3 counts as selected', async () => {
        await searchInput().fill('3');
        await expect(rowNames()).toHaveText([ENV_3]);
        await expect(selectedRowNames()).toHaveText([ENV_3]);
      });

      await test.step('Deleting from the context menu removes only the visible environment', async () => {
        await openRowContextMenu(page, ENV_3, 'global');
        await contextMenuItem('delete').click();
        await deleteModal.confirm().click();
        await expect(deleteModal.root()).toBeHidden();
      });

      await test.step('Clearing the search brings the hidden selection back', async () => {
        await searchInput().fill('');
        await expect(rowNames()).toHaveText([ENV_1, ENV_2, ENV_4]);
        await expect(selectedRowNames()).toHaveText([ENV_1, ENV_2]);
      });
    });
  });

  test.describe('row menu', () => {
    test('lists the actions for a single environment', async ({ page }) => {
      const { rowMenuButton, rowMenuItem } = buildCommonLocators(page).environment.workspaceSidebarActions;

      await test.step('Open the row menu', async () => {
        await rowMenuButton(ENV_2).click();
      });

      await test.step('It lists the single-environment actions', async () => {
        await expect(rowMenuItem('export')).toBeVisible();
        await expect(rowMenuItem('rename')).toBeVisible();
        await expect(rowMenuItem('duplicate')).toBeVisible();
        await expect(rowMenuItem('select-all')).toHaveText(/^Select all/);
        await expect(rowMenuItem('delete')).toHaveText(/^Delete(?! \()/);
      });
    });

    test('rename edits the environment name inline', async ({ page }) => {
      const { rowMenuButton, rowMenuItem, rowRenameInput, rowNames } = buildCommonLocators(page).environment.workspaceSidebarActions;
      const renamed = `${ENV_2} renamed`;

      await rowMenuButton(ENV_2).click();
      await rowMenuItem('rename').click();

      await expect(rowRenameInput()).toHaveValue(ENV_2);
      await rowRenameInput().fill(renamed);
      await rowRenameInput().press('Enter');

      await expect(rowRenameInput()).toBeHidden();
      await expect(rowNames()).toHaveText([ENV_1, renamed, ENV_3, ENV_4]);
    });

    test('rename saves the new name when clicking outside', async ({ page }) => {
      const { rowMenuButton, rowMenuItem, rowRenameInput, rowNames } = buildCommonLocators(page).environment.workspaceSidebarActions;
      const renamed = `${ENV_2} renamed`;

      await rowMenuButton(ENV_2).click();
      await rowMenuItem('rename').click();
      await rowRenameInput().fill(renamed);

      await clickEmptyListSpace(page, 'global');

      await expect(rowRenameInput()).toBeHidden();
      await expect(rowNames()).toHaveText([ENV_1, renamed, ENV_3, ENV_4]);
    });

    test('rename with an unchanged name closes the input when clicking outside', async ({ page }) => {
      const { rowMenuButton, rowMenuItem, rowRenameInput, rowNames } = buildCommonLocators(page).environment.workspaceSidebarActions;

      await rowMenuButton(ENV_2).click();
      await rowMenuItem('rename').click();
      await expect(rowRenameInput()).toHaveValue(ENV_2);

      await clickEmptyListSpace(page, 'global');

      await expect(rowRenameInput()).toBeHidden();
      await expect(rowNames()).toHaveText(ENV_NAMES);
    });

    test('rename with an invalid name stays open when clicking outside', async ({ page }) => {
      const { rowMenuButton, rowMenuItem, rowRenameInput, rowNames } = buildCommonLocators(page).environment.workspaceSidebarActions;

      await rowMenuButton(ENV_2).click();
      await rowMenuItem('rename').click();
      await rowRenameInput().fill('bad/name');

      await clickEmptyListSpace(page, 'global');

      await expect(rowRenameInput()).toBeVisible();
      await expect(rowRenameInput()).toHaveValue('bad/name');

      await rowRenameInput().press('Escape');
      await expect(rowRenameInput()).toBeHidden();
      await expect(rowNames()).toHaveText(ENV_NAMES);
    });

    test('duplicate creates a copy of the environment', async ({ page }) => {
      const { environment } = buildCommonLocators(page);
      const { rows, rowMenuButton, rowMenuItem, copyModal } = environment.workspaceSidebarActions;
      const copyName = `${ENV_2} - Copy`;

      await rowMenuButton(ENV_2).click();
      await rowMenuItem('duplicate').click();

      await expect(copyModal.nameInput()).toHaveValue(copyName);
      await copyModal.submit().click();

      await expect(copyModal.root()).toBeHidden();
      await expect(environment.sidebarListItemExact('global', copyName)).toBeVisible();
      await expect(rows()).toHaveCount(ENV_NAMES.length + 1);
    });

    test('delete removes the environment after confirmation', async ({ page }) => {
      const { rowMenuButton, rowMenuItem, rowNames, deleteModal } = buildCommonLocators(page).environment.workspaceSidebarActions;

      await rowMenuButton(ENV_2).click();
      await rowMenuItem('delete').click();

      await expect(deleteModal.root()).toBeVisible();
      await expect(deleteModal.activeWarning()).toBeHidden();

      await deleteModal.confirm().click();

      await expect(deleteModal.root()).toBeHidden();
      await expect(rowNames()).toHaveText([ENV_1, ENV_3, ENV_4]);
    });

    test('delete warns that the workspace is left without an environment when the active one is deleted', async ({ page }) => {
      const { rowActivateButton, rowMenuButton, rowMenuItem, rowNames, deleteModal } = buildCommonLocators(page).environment.workspaceSidebarActions;

      await rowActivateButton(ENV_3).click();
      await rowMenuButton(ENV_3).click();
      await rowMenuItem('delete').click();

      await expect(deleteModal.activeWarning()).toContainText(ENV_3);
      await expect(deleteModal.activeWarning()).toContainText('the workspace with no environment selected');

      await deleteModal.confirm().click();

      await expect(deleteModal.root()).toBeHidden();
      await expect(rowNames()).toHaveText([ENV_1, ENV_2, ENV_4]);
    });

    test('export opens the export modal for that environment only', async ({ page }) => {
      const { environment } = buildCommonLocators(page);
      const { exportModal } = environment;
      const { rowMenuButton, rowMenuItem } = environment.workspaceSidebarActions;

      await rowMenuButton(ENV_2).click();
      await rowMenuItem('export').click();

      await expect(exportModal.root()).toBeVisible();
      await expect(exportModal.environmentCheckbox(ENV_2)).toBeChecked();
      // Env 1 is neither exported nor inherited, so it is not listed.
      await expect(exportModal.environmentCheckbox(ENV_1)).toHaveCount(0);
      await expect(exportModal.submit()).toHaveText('Export 1 Environment');

      await page.keyboard.press('Escape');
      await expect(exportModal.root()).toBeHidden();
    });
  });

  test.describe('context menu', () => {
    test('right-clicking a multi-selection hides Rename and Duplicate, and Delete removes every selected environment', async ({ page }) => {
      const { environment } = buildCommonLocators(page);
      const { contextMenuItem, deleteModal, rowNames } = environment.workspaceSidebarActions;

      await test.step('Select Env 2, Env 3 and Env 4', async () => {
        await ctrlClickRows(page, [ENV_2, ENV_3, ENV_4], 'global');
      });

      await openRowContextMenu(page, ENV_3, 'global');

      await expect(contextMenuItem('export')).toBeVisible();
      await expect(contextMenuItem('rename')).toHaveCount(0);
      await expect(contextMenuItem('duplicate')).toHaveCount(0);
      await expect(contextMenuItem('delete')).toHaveText(/^Delete \(3\)/);

      await contextMenuItem('delete').click();
      await expect(deleteModal.confirm()).toHaveText('Delete (3)');
      await deleteModal.confirm().click();

      await expect(deleteModal.root()).toBeHidden();
      await expect(rowNames()).toHaveText([ENV_1]);
    });
  });

  test.describe('shortcuts', () => {
    test('Cmd/Ctrl+A selects every environment and pressing it again clears the selection', async ({ page }) => {
      const { environment } = buildCommonLocators(page);
      const { selectedRows, selectedRowNames } = environment.workspaceSidebarActions;

      await environment.sidebarListItemExact('global', ENV_2).click();

      await page.keyboard.press(SELECT_ALL_KEY);
      await expect(selectedRowNames()).toHaveText(ENV_NAMES);

      await page.keyboard.press(SELECT_ALL_KEY);
      await expect(selectedRows()).toHaveCount(0);
    });

    test('the delete key deletes the open environment, or every selected environment', async ({ page }) => {
      const { environment } = buildCommonLocators(page);
      const { deleteModal, rowNames } = environment.workspaceSidebarActions;

      await test.step('With nothing selected, the delete key targets the open environment', async () => {
        await environment.sidebarListItemExact('global', ENV_2).click();
        await page.keyboard.press(DELETE_KEY);

        await expect(deleteModal.root()).toContainText(ENV_2);
        await expect(deleteModal.confirm()).toHaveText('Delete');

        await page.keyboard.press('Escape');
        await expect(deleteModal.root()).toBeHidden();
      });

      await test.step('With Env 2 and Env 3 selected, the delete modal opens', async () => {
        await ctrlClickRows(page, [ENV_2, ENV_3], 'global');
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
      const { deleteModal, rowNames, searchInput } = environment.workspaceSidebarActions;

      await environment.sidebarListItemExact('global', ENV_2).click();

      await test.step('Search for another environment, so the open one is hidden', async () => {
        await searchInput().fill('3');
        await expect(rowNames()).toHaveText([ENV_3]);
      });

      await test.step('The delete key with the list focused opens no modal', async () => {
        await clickEmptyListSpace(page, 'global');
        await page.keyboard.press(DELETE_KEY);
        await expect(deleteModal.root()).toBeHidden();
      });

      await test.step('Clearing the search shows the open environment again, so the delete key targets it', async () => {
        await searchInput().fill('');
        await expect(rowNames()).toHaveText(ENV_NAMES);
        await clickEmptyListSpace(page, 'global');
        await page.keyboard.press(DELETE_KEY);
        await expect(deleteModal.root()).toContainText(ENV_2);
      });
    });

    test('the delete key with the context menu open deletes the right-clicked environment, not the selection', async ({ page }) => {
      const { selectedRowNames, deleteModal, rowNames } = buildCommonLocators(page).environment.workspaceSidebarActions;

      await ctrlClickRows(page, [ENV_1, ENV_2], 'global');
      await expect(selectedRowNames()).toHaveText([ENV_1, ENV_2]);

      await openRowContextMenu(page, ENV_4, 'global');
      await page.keyboard.press(DELETE_KEY);
      await expect(deleteModal.root()).toBeVisible();

      await deleteModal.confirm().click();

      await expect(deleteModal.root()).toBeHidden();
      await expect(rowNames()).toHaveText([ENV_1, ENV_2, ENV_3]);
    });

    test('escape clears the selection', async ({ page }) => {
      const { environment } = buildCommonLocators(page);
      const { selectedRows } = environment.workspaceSidebarActions;

      await ctrlClickRows(page, [ENV_2, ENV_3], 'global');
      await expect(selectedRows()).toHaveCount(2);

      await page.keyboard.press('Escape');

      await expect(selectedRows()).toHaveCount(0);
    });
  });

  test.describe('provides create env option when no matches found in search', () => {
    test('provides a create option when no matching environments are found', async ({ page }) => {
      const { searchInput, rows, emptyState, createFromSearch } = buildCommonLocators(page).environment.workspaceSidebarActions;

      await test.step('search with matches does not provide a create option', async () => {
        await searchInput().fill('Env 4');
        await expect(rows()).toHaveCount(1);
        await expect(createFromSearch()).toHaveCount(0);
      });

      await test.step('search is trimmed so whitespace is ignored', async () => {
        await searchInput().fill(' Env 4 ');
        await expect(rows()).toHaveCount(1);
        await expect(createFromSearch()).toHaveCount(0);
      });

      await test.step('search with no match provides a create option', async () => {
        await searchInput().fill('Staging');
        await expect(rows()).toHaveCount(0);
        await expect(emptyState()).toBeVisible();
        await expect(createFromSearch()).toContainText('Create "Staging"');
      });
    });

    test('clicking the create row creates the environment and opens it', async ({ page }) => {
      const { environment } = buildCommonLocators(page);
      const { searchInput, rows, createFromSearch } = environment.workspaceSidebarActions;

      await searchInput().fill('Staging');
      await createFromSearch().click();

      await expect(searchInput()).toHaveValue('');
      await expect(rows()).toHaveCount(ENV_NAMES.length + 1);
      await expect(environment.sidebarListItemExact('global', 'Staging')).toHaveAttribute('aria-current', 'true');
    });

    test('invalid name shows an error', async ({ page }) => {
      const { searchInput, rows, createFromSearch, createFromSearchError } = buildCommonLocators(page).environment.workspaceSidebarActions;

      await searchInput().fill('bad/name');
      await expect(createFromSearchError()).toHaveCount(0);

      await createFromSearch().click();
      await expect(createFromSearchError()).toBeVisible();
      await expect(rows()).toHaveCount(0);

      // Editing the name clears the error.
      await searchInput().fill('bad/name2');
      await expect(createFromSearchError()).toHaveCount(0);
    });
  });
});
