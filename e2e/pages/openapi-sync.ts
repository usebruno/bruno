import { test, Page } from '../playwright';
import { waitForPredicate } from '../utils/wait';
import { buildSidebarLocators } from './sidebar/collection-tree';
import { buildCollectionHeaderLocators } from './collection/header';

export const buildOpenApiSyncLocators = (page: Page) => {
  const settingsModal = () => page.getByTestId('connection-settings-modal');
  const workspaceMenu = () => page.getByRole('menu').filter({
    has: page.locator('[data-testid^="spec-source-workspace-menu-"]')
  });
  const endpointRow = (endpointId: string) => page.getByTestId(`openapi-sync-endpoint-${endpointId}`);

  return {
    sourceTab: (key: 'workspace' | 'url' | 'file') => page.getByTestId(`tab-${key}`),
    workspaceSelect: () => page.getByTestId('spec-source-workspace-select'),
    workspaceMenu,
    workspaceOptions: () => workspaceMenu().getByRole('menuitem'),
    workspaceOption: (specName: string) => workspaceMenu().getByRole('menuitem', { name: specName, exact: true }),
    urlInput: () => page.getByTestId('spec-source-url-input'),
    fileInput: () => page.getByTestId('spec-source-file-input'),
    fileButton: () => page.getByTestId('spec-source-file-button'),
    connectButton: () => page.getByTestId('openapi-connect-button'),
    connectError: () => page.getByTestId('openapi-connect-error'),
    checkUpdatesButton: () => page.getByTestId('openapi-sync-check-updates'),
    specUpdatesTab: () => page.getByTestId('responsive-tab-spec-updates'),
    overviewBanner: () => page.getByTestId('openapi-sync-overview-banner'),
    specStatusBanner: () => page.getByTestId('openapi-sync-spec-status'),
    endpointRow,
    endpointRowToggle: (endpointId: string) => endpointRow(endpointId).getByTestId('openapi-sync-endpoint-toggle'),
    endpointConflictBadge: (endpointId: string) => endpointRow(endpointId).getByTestId('openapi-sync-endpoint-conflict'),
    decisionButton: (endpointId: string, decision: 'keep' | 'accept') => endpointRow(endpointId).getByTestId(`openapi-sync-decision-${decision}`),
    diffPane: (endpointId: string, section: string, side: 'old' | 'new') => endpointRow(endpointId)
      .locator('.diff-row')
      .filter({ has: page.locator('.diff-row-title').getByText(section, { exact: true }) })
      .locator(`.diff-row-pane.${side}`),
    applyButton: () => page.getByTestId('openapi-sync-apply'),
    confirmButton: () => page.getByTestId('openapi-sync-confirm'),
    collectionChangesTab: () => page.getByTestId('responsive-tab-collection-changes'),
    changeSectionHeader: (title: string) => page.getByText(title, { exact: true }),
    resetEndpointButton: (endpointId: string) => endpointRow(endpointId).getByRole('button', { name: 'Reset', exact: true }),
    confirmActionButton: () => page.getByRole('button', { name: 'Confirm', exact: true }),

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
    await buildCollectionHeaderLocators(page).openApiSync().click();
  });
};

export const checkForUpdates = async (page: Page) => {
  await test.step('Check the spec for updates', async () => {
    const { checkUpdatesButton } = buildOpenApiSyncLocators(page);
    await checkUpdatesButton().click();
    const finished = await waitForPredicate(() => checkUpdatesButton().isEnabled(), { tries: 150 });
    if (!finished) {
      throw new Error('The check for spec updates did not finish');
    }
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

export const waitForWorkspaceMenuFocus = async (page: Page) => {
  const menu = buildOpenApiSyncLocators(page).workspaceMenu();
  const hasFocus = await waitForPredicate(
    () => menu.evaluate((element) => element.contains(document.activeElement)),
    { tries: 50 }
  );
  if (!hasFocus) {
    throw new Error('The workspace spec menu did not take focus');
  }
};
