import { Locator, Page, ElectronApplication, test } from '../../../../playwright';
import { buildSidebarLocators } from '../sidebar';
import { stubOpenDirectoryDialog } from '../../stubs';

// Locators for the Share Collection modal opened from collection settings
// or the collection row Share action.
// OSS shows ZIP / YAML / Postman. Enterprise adds Git / Export / Embed tabs and an OpenAPI card.
// Proceed on OpenAPI opens the Export API Spec modal (name + location).
export const buildShareCollectionLocators = (page: Page) => {
  const modal = (): Locator => page.getByTestId('share-collection-modal');
  return {
    modal,
    gitTab: (): Locator => page.getByTestId('share-collection-tab-git'),
    exportTab: (): Locator => page.getByTestId('share-collection-tab-export'),
    embedTab: (): Locator => page.getByTestId('share-collection-tab-embed'),
    zipCard: (): Locator => page.getByTestId('export-format-zip'),
    yamlCard: (): Locator => page.getByTestId('export-format-yaml'),
    postmanCard: (): Locator => page.getByTestId('export-format-postman'),
    openApiCard: (): Locator => page.getByTestId('export-format-openapi'),
    closeButton: (): Locator => modal().getByTestId('modal-close-button'),
    nonExportableNote: (): Locator =>
      page.getByTestId('share-collection-non-exportable-note').or(
        page.getByText('gRPC requests in this collection will not be exported')
      ),
    proceedButton: (): Locator =>
      page.getByTestId('share-collection-proceed').or(page.getByRole('button', { name: 'Proceed', exact: true })),
    collectionActions: (collectionName: string): Locator =>
      page
        .getByTestId('collections')
        .locator('.collection-name')
        .filter({ hasText: collectionName })
        .locator('.collection-actions .icon'),
    shareMenuItem: (): Locator => page.locator('.dropdown-item').filter({ hasText: 'Share' }),
    title: (): Locator => page.locator('.bruno-modal-header-title').filter({ hasText: 'Share Collection' }),
    nameInput: (): Locator => page.getByLabel('Name', { exact: true }),
    locationInput: (): Locator => page.getByLabel('Location', { exact: true }),
    exportApiSpecTitle: (): Locator => page.locator('.bruno-modal-header-title').filter({ hasText: 'Export API Spec' }),
    createButton: (): Locator => page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }),
    exportedToast: (): Locator => page.getByRole('status').filter({ hasText: 'Api Spec exported' })
  };
};

export const openShareCollection = async (page: Page, collectionName: string) => {
  await test.step(`Open Share Collection for "${collectionName}"`, async () => {
    const locators = buildShareCollectionLocators(page);
    await buildSidebarLocators(page).collection(collectionName).hover();
    await locators.collectionActions(collectionName).waitFor({ state: 'visible' });
    await locators.collectionActions(collectionName).click();
    await locators.shareMenuItem().click();
    await locators.title().waitFor({ state: 'visible' });
  });
};

export const openExportTabIfPresent = async (page: Page) => {
  await test.step('Open the Export tab when it is present', async () => {
    const locators = buildShareCollectionLocators(page);
    const exportTab = locators.exportTab();
    if (await exportTab.isVisible()) {
      await exportTab.click();
      await exportTab.and(page.locator('.active')).waitFor({ state: 'visible' });
    }
    await locators.zipCard().waitFor({ state: 'visible' });
  });
};

export const selectOpenApiFormat = async (page: Page) => {
  await test.step('Select OpenAPI Specification', async () => {
    const locators = buildShareCollectionLocators(page);
    await locators.openApiCard().click();
    await locators.nonExportableNote().waitFor({ state: 'visible' });
  });
};

export const proceedToExportApiSpec = async (page: Page) => {
  await test.step('Proceed to Export API Spec', async () => {
    const locators = buildShareCollectionLocators(page);
    await locators.proceedButton().click();
    await locators.exportApiSpecTitle().waitFor({ state: 'visible' });
  });
};

export const saveOpenApiSpecification = async (
  page: Page,
  electronApp: ElectronApplication,
  outputDir: string
) => {
  await test.step('Save the OpenAPI spec to disk', async () => {
    const locators = buildShareCollectionLocators(page);
    await stubOpenDirectoryDialog(electronApp, [outputDir]);
    await locators.locationInput().click();
    await locators.createButton().click();
    await locators.exportApiSpecTitle().waitFor({ state: 'hidden' });
  });
};

export const closeShareCollection = async (page: Page) => {
  await test.step('Close Share Collection', async () => {
    const locators = buildShareCollectionLocators(page);
    await locators.closeButton().click();
    await locators.modal().waitFor({ state: 'hidden' });
  });
};
