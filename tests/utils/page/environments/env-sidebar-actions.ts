import { Page } from '../../../../playwright';

export type EnvironmentMenuItemId = 'export' | 'rename' | 'duplicate' | 'select-all' | 'delete';

const envRow = (page: Page, name: string) =>
  page.getByTestId('collection-env-list-item').filter({ has: page.getByText(name, { exact: true }) });

const selectedRowLocator = (page: Page) =>
  page.getByTestId('collection-env-list-item').and(page.getByRole('option', { selected: true }));

/**
 * Locators for the collection environments list actions
 */
export const buildEnvSidebarActionsLocators = (page: Page) => ({
  rowActivateButton: (name: string) => envRow(page, name).getByTestId('env-activate-btn'),
  rowMenuButton: (name: string) => envRow(page, name).getByTestId('env-row-menu-btn'),
  rowMenuItem: (id: EnvironmentMenuItemId) => page.getByTestId(`env-row-menu-${id}`),
  rowMenuShortcut: (id: EnvironmentMenuItemId) => page.getByTestId(`env-row-menu-${id}-shortcut`),

  // Right-click context menu.
  contextMenu: () => page.getByTestId('env-context-menu-dropdown'),
  contextMenuItem: (id: EnvironmentMenuItemId) => page.getByTestId(`env-context-menu-${id}`),
  contextMenuShortcut: (id: EnvironmentMenuItemId) => page.getByTestId(`env-context-menu-${id}-shortcut`),

  rows: () => page.getByTestId('collection-env-list-item'),
  rowNames: () => page.getByTestId('collection-env-name'),
  searchInput: () => page.getByPlaceholder('Search environments...'),

  selectedRows: () => selectedRowLocator(page),
  selectedRowNames: () => selectedRowLocator(page).getByTestId('collection-env-name'),

  rowRenameInput: () => page.getByTestId('env-rename-name-input'),

  deleteModal: {
    root: () => page.getByTestId('delete-environments-modal'),
    confirm: () => page.getByTestId('delete-environments-modal-submit-btn'),
    activeWarning: () => page.getByTestId('delete-environments-active-warning')
  },

  copyModal: {
    root: () => page.getByTestId('copy-environment-modal'),
    nameInput: () => page.getByTestId('copy-environment-name-input'),
    submit: () => page.getByTestId('copy-environment-modal-submit-btn')
  }
});
