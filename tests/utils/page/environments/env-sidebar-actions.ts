import { Page } from '../../../../playwright';
import type { EnvironmentScope } from '.';

export type EnvironmentMenuItemId = 'export' | 'rename' | 'duplicate' | 'select-all' | 'delete';

const SCOPE_TEST_IDS = {
  collection: {
    row: 'collection-env-list-item',
    name: 'collection-env-name',
    empty: 'collection-env-empty',
    searchInput: 'collection-env-search-input',
    sectionBody: 'collection-environments-section-content',
    deleteModal: 'delete-environments'
  },
  global: {
    row: 'workspace-env-list-item',
    name: 'workspace-env-name',
    empty: 'workspace-env-empty',
    searchInput: 'workspace-env-search-input',
    sectionBody: 'workspace-environments-section-content',
    deleteModal: 'delete-global-environments'
  }
};

/**
 * Locators for the environments list actions of one scope
 */
export const buildEnvSidebarActionsLocators = (page: Page, scope: EnvironmentScope = 'collection') => {
  const ids = SCOPE_TEST_IDS[scope];
  const rows = () => page.getByTestId(ids.row);
  const envRow = (name: string) => rows().filter({ has: page.getByText(name, { exact: true }) });
  const selectedRows = () => rows().and(page.getByRole('option', { selected: true }));

  return {
    rowActivateButton: (name: string) => envRow(name).getByTestId('env-activate-btn'),
    rowMenuButton: (name: string) => envRow(name).getByTestId('env-row-menu-btn'),
    rowMenuItem: (id: EnvironmentMenuItemId) => page.getByTestId(`env-row-menu-${id}`),
    rowMenuShortcut: (id: EnvironmentMenuItemId) => page.getByTestId(`env-row-menu-${id}-shortcut`),

    // Right-click context menu.
    contextMenu: () => page.getByTestId('env-context-menu-dropdown'),
    contextMenuItem: (id: EnvironmentMenuItemId) => page.getByTestId(`env-context-menu-${id}`),
    contextMenuShortcut: (id: EnvironmentMenuItemId) => page.getByTestId(`env-context-menu-${id}-shortcut`),

    // The Environments section body: the list, the empty space under it and the search box.
    sectionBody: () => page.getByTestId(ids.sectionBody),
    emptyState: () => page.getByTestId(ids.empty),

    rows,
    rowNames: () => page.getByTestId(ids.name),
    searchInput: () => page.getByTestId(ids.searchInput),

    selectedRows,
    selectedRowNames: () => selectedRows().getByTestId(ids.name),

    rowRenameInput: () => page.getByTestId('env-rename-name-input'),

    deleteModal: {
      root: () => page.getByTestId(`${ids.deleteModal}-modal`),
      confirm: () => page.getByTestId(`${ids.deleteModal}-modal-submit-btn`),
      activeWarning: () => page.getByTestId(`${ids.deleteModal}-active-warning`)
    },

    copyModal: {
      root: () => page.getByTestId('copy-environment-modal'),
      nameInput: () => page.getByTestId('copy-environment-name-input'),
      submit: () => page.getByTestId('copy-environment-modal-submit-btn')
    }
  };
};
