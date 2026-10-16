import { Page, test } from '../../../../playwright';
import type { EnvironmentScope } from '.';

export type EnvironmentMenuItemId = 'export' | 'rename' | 'duplicate' | 'select-all' | 'delete';

const SCOPE_PREFIX = {
  collection: 'collection',
  global: 'workspace'
};

const DELETE_MODAL_PREFIX = {
  collection: 'delete-environments',
  global: 'delete-global-environments'
};

// Ctrl on Windows/Linux, Cmd on macOS.
export const IS_MAC = process.platform === 'darwin';
export const SELECT_MODIFIER: 'Meta' | 'Control' = IS_MAC ? 'Meta' : 'Control';

export const SELECT_ALL_KEY = `${SELECT_MODIFIER}+KeyA`;
// macOS has no Delete key: Cmd+Backspace. Windows/Linux use the plain Delete key.
export const DELETE_KEY = IS_MAC ? 'Meta+Backspace' : 'Delete';

/**
 * Locators for the environments list actions of one scope
 */
export const buildEnvSidebarActionsLocators = (page: Page, scope: EnvironmentScope = 'collection') => {
  const scopedTestId = (suffix: string) => page.getByTestId(`${SCOPE_PREFIX[scope]}-${suffix}`);
  const deleteModalPrefix = DELETE_MODAL_PREFIX[scope];
  const rows = () => scopedTestId('env-list-item');
  const envRow = (name: string) => rows().filter({ has: page.getByText(name, { exact: true }) });
  const selectedRows = () => rows().and(page.getByRole('option', { selected: true }));

  return {
    // The row of the environment with exactly this name.
    row: envRow,
    rowActivateButton: (name: string) => envRow(name).getByTestId('env-activate-btn'),
    rowMenuButton: (name: string) => envRow(name).getByTestId('env-row-menu-btn'),
    rowMenuItem: (id: EnvironmentMenuItemId) => page.getByTestId(`env-row-menu-${id}`),
    rowMenuShortcut: (id: EnvironmentMenuItemId) => page.getByTestId(`env-row-menu-${id}-shortcut`),

    // Right-click context menu.
    contextMenu: () => page.getByTestId('env-context-menu-dropdown'),
    contextMenuItem: (id: EnvironmentMenuItemId) => page.getByTestId(`env-context-menu-${id}`),
    contextMenuShortcut: (id: EnvironmentMenuItemId) => page.getByTestId(`env-context-menu-${id}-shortcut`),

    // The Environments section body: the list, the empty space under it and the search box.
    sectionBody: () => scopedTestId('environments-section-content'),
    emptyState: () => scopedTestId('env-empty'),

    rows,
    rowNames: () => scopedTestId('env-name'),
    searchInput: () => scopedTestId('env-search-input'),

    // The create row offered when the search matches no environment.
    createFromSearch: () => scopedTestId('env-create-from-search'),
    createFromSearchError: () => scopedTestId('env-create-from-search-error'),

    selectedRows,
    selectedRowNames: () => selectedRows().getByTestId(`${SCOPE_PREFIX[scope]}-env-name`),

    rowRenameInput: () => page.getByTestId('env-rename-name-input'),

    deleteModal: {
      root: () => page.getByTestId(`${deleteModalPrefix}-modal`),
      confirm: () => page.getByTestId(`${deleteModalPrefix}-modal-submit-btn`),
      activeWarning: () => page.getByTestId(`${deleteModalPrefix}-active-warning`)
    },

    copyModal: {
      root: () => page.getByTestId('copy-environment-modal'),
      nameInput: () => page.getByTestId('copy-environment-name-input'),
      submit: () => page.getByTestId('copy-environment-modal-submit-btn')
    }
  };
};

/**
 * Cmd/Ctrl-click each row in turn. The first click also selects the environment that is open in the editor.
 */
export const ctrlClickRows = async (page: Page, names: string[], scope: EnvironmentScope = 'collection') => {
  const { row } = buildEnvSidebarActionsLocators(page, scope);

  await test.step(`Cmd/Ctrl-click ${names.join(', ')}`, async () => {
    for (const name of names) {
      await row(name).click({ modifiers: [SELECT_MODIFIER] });
    }
  });
};

// Click in the empty space below the rows. This clears the selection.
export const clickEmptyListSpace = async (page: Page, scope: EnvironmentScope = 'collection') => {
  const { sectionBody, rows } = buildEnvSidebarActionsLocators(page, scope);

  await test.step('Click the empty space below the rows', async () => {
    const box = await sectionBody().boundingBox();
    const lastRowBox = await rows().last().boundingBox();
    if (!box || !lastRowBox) throw new Error('The environments section body or its rows are not visible');

    // Click just below the last row.
    const y = lastRowBox.y + lastRowBox.height - box.y + 8;
    if (y > box.height - 4) {
      throw new Error('There is no empty space below the rows to click, the section body is full');
    }

    await sectionBody().click({ position: { x: box.width / 2, y } });
  });
};

export const openRowContextMenu = async (page: Page, name: string, scope: EnvironmentScope = 'collection') => {
  const { row, contextMenu } = buildEnvSidebarActionsLocators(page, scope);

  await test.step(`Right-click "${name}"`, async () => {
    await row(name).click({ button: 'right' });
    await contextMenu().waitFor({ state: 'visible' });
  });
};

/**
 * Delete every workspace (global) environment from the open workspace Environments tab.
 * Workspace environments persist across tests, so this keeps them isolated.
 * Rows are deleted one at a time through the row menu, so the cleanup does not rely on the
 * multi-select or keyboard shortcuts that the tests exercise.
 */
export const deleteAllWorkspaceEnvironments = async (page: Page) => {
  await test.step('Delete all workspace environments', async () => {
    const { row, rows, rowNames, emptyState, rowMenuButton, rowMenuItem, deleteModal }
      = buildEnvSidebarActionsLocators(page, 'global');

    // Close anything a failed test left open (modal, menu, rename input)
    await page.keyboard.press('Escape');

    // Wait for the list to settle (a row or the empty state), so a list that is still rendering isn't read as empty.
    await rows().first().or(emptyState()).waitFor({ state: 'visible' });

    for (const name of await rowNames().allTextContents()) {
      await rowMenuButton(name).click();
      await rowMenuItem('delete').click();
      await deleteModal.confirm().click();
      await deleteModal.root().waitFor({ state: 'hidden' });
      await row(name).waitFor({ state: 'detached' });
    }
  });
};
