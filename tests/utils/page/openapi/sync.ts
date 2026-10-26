import { test, Page } from '../../../../playwright';
import { buildSidebarLocators } from '../sidebar';
import { buildCollectionHeaderLocators } from '../collection/collection-header';

export const buildOpenApiSyncLocators = (page: Page) => {
  const settingsModal = () => page.locator('.bruno-modal-card').filter({ hasText: 'Connection Settings' });
  const workspaceMenu = () => page.getByRole('menu').filter({
    has: page.locator('[data-testid^="spec-source-workspace-menu-"]')
  });

  return {
    collectionHeaderOpenApiIcon: () => page.getByRole('button', { name: 'OpenAPI' }),

    sourceTab: (key: 'workspace' | 'url' | 'file') => page.getByTestId(`tab-${key}`),
    workspaceSelect: () => page.getByTestId('spec-source-workspace-select'),
    workspaceMenu,
    workspaceOptions: () => workspaceMenu().getByRole('menuitem'),
    workspaceOption: (specName: string) => workspaceMenu().getByRole('menuitem', { name: specName, exact: true }),
    urlInput: () => page.getByTestId('spec-source-url-input'),
    fileInput: () => page.getByTestId('spec-source-file-input'),
    fileButton: () => page.getByTestId('spec-source-file-button'),
    connectButton: () => page.getByRole('button', { name: 'Connect', exact: true }),
    connectError: () => page.getByTestId('openapi-connect-error'),
    connectedHeader: () => page.getByTestId('openapi-sync-check-updates'),
    specUpdatesTab: () => page.getByTestId('responsive-tab-spec-updates'),
    overviewBanner: () => page.getByTestId('openapi-sync-overview-banner'),
    specStatusBanner: () => page.getByTestId('openapi-sync-spec-status'),

    headerMenu: () => page.getByTestId('openapi-sync-header-menu'),
    editSettingsItem: () => page.getByTestId('openapi-sync-header-menu-settings'),
    settingsModal,
    settingsSave: () => settingsModal().getByRole('button', { name: 'Save' })
  };
};

export const openOpenApiSyncTab = async (page: Page, collectionName: string) => {
  await test.step(`Open the OpenAPI tab of "${collectionName}"`, async () => {
    const collectionHeader = buildCollectionHeaderLocators(page);
    await buildSidebarLocators(page).collectionRow(collectionName).click();
    await collectionHeader.overflowMenu().click();
    await collectionHeader.overflowMenuItem('openapi-sync').click();
  });
};

export const openConnectedOpenApiSyncTab = async (page: Page, collectionName: string) => {
  await test.step(`Open the OpenAPI tab of connected "${collectionName}"`, async () => {
    await buildSidebarLocators(page).collectionRow(collectionName).click();
    await buildOpenApiSyncLocators(page).collectionHeaderOpenApiIcon().click();
  });
};

export const openConnectionSettings = async (page: Page) => {
  await test.step('Open Connection Settings', async () => {
    const sync = buildOpenApiSyncLocators(page);
    await sync.headerMenu().click();
    await sync.editSettingsItem().click();
  });
};

export const pickWorkspaceSpec = async (page: Page, specName: string) => {
  await test.step(`Pick the workspace spec "${specName}"`, async () => {
    const sync = buildOpenApiSyncLocators(page);
    await sync.workspaceSelect().click();
    await sync.workspaceOption(specName).click();
  });
};
