import { Page } from '../../../../playwright';
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
