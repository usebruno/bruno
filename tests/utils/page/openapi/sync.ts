import { test, Page } from '../../../../playwright';

export const buildOpenApiSyncLocators = (page: Page) => ({
  collectionRow: (name: string) => page.getByTestId('sidebar-collection-row').filter({ hasText: name }),
  collectionHeaderMoreActions: () => page.getByTestId('more-actions'),
  collectionHeaderOpenApiItem: () => page.getByTestId('more-actions-openapi-sync'),
  collectionHeaderOpenApiIcon: () => page.getByRole('button', { name: 'OpenAPI' }),

  sourceTab: (key: 'workspace' | 'url' | 'file') => page.getByTestId(`responsive-tab-${key}`),
  workspaceSelect: () => page.getByTestId('spec-source-workspace-select'),
  workspaceSelectedOption: () => page.getByTestId('spec-source-workspace-select').locator('option:checked'),
  workspaceOptions: () => page.getByTestId('spec-source-workspace-select').locator('option'),
  urlInput: () => page.getByTestId('spec-source-url-input'),
  fileInput: () => page.getByTestId('spec-source-file-input'),
  fileButton: () => page.getByTestId('spec-source-file-button'),
  connectButton: () => page.getByRole('button', { name: 'Connect', exact: true }),
  connectedHeader: () => page.getByRole('button', { name: 'Check for updates' }),

  headerMenu: () => page.getByTestId('openapi-sync-header-menu'),
  editSettingsItem: () => page.getByTestId('openapi-sync-header-menu-settings'),
  settingsModal: () => page.locator('.bruno-modal-card').filter({ hasText: 'Connection Settings' }),
  settingsSave: () => page.locator('.bruno-modal-card').getByRole('button', { name: 'Save' })
});

export const openOpenApiSyncTab = async (page: Page, collectionName: string) => {
  await test.step(`Open the OpenAPI tab of "${collectionName}"`, async () => {
    const sync = buildOpenApiSyncLocators(page);
    await sync.collectionRow(collectionName).click();
    await sync.collectionHeaderMoreActions().click();
    await sync.collectionHeaderOpenApiItem().click();
  });
};

export const openConnectedOpenApiSyncTab = async (page: Page, collectionName: string) => {
  await test.step(`Open the OpenAPI tab of connected "${collectionName}"`, async () => {
    const sync = buildOpenApiSyncLocators(page);
    await sync.collectionRow(collectionName).click();
    await sync.collectionHeaderOpenApiIcon().click();
  });
};

export const openConnectionSettings = async (page: Page) => {
  await test.step('Open Connection Settings', async () => {
    const sync = buildOpenApiSyncLocators(page);
    await sync.headerMenu().click();
    await sync.editSettingsItem().click();
  });
};
