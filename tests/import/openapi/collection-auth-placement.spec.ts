import { test, expect, Page } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, importCollection, openCollectionSettings, openRequest, selectRequestPaneTab } from '../../utils/page';
import { AUTH_MODE_LABELS } from '../../utils/constants';
import { expectSyncedWithSpec, readOpenApiSyncConfig } from '../../utils/openapi-sync';

const fixture = (name: string) => path.resolve(__dirname, 'fixtures', name);

const expectAuthAtCollectionLevel = async (page: Page, collectionName: string, schemeLabel: string) => {
  const locators = buildCommonLocators(page);

  await test.step('The collection holds the spec\'s security scheme', async () => {
    await openCollectionSettings(page, collectionName);
    await locators.paneTabs.collectionSettingsTab('auth').click();
    await expect(locators.auth.modeSelector()).toContainText(schemeLabel);
  });

  await test.step('A request using the same scheme inherits it', async () => {
    await openRequest(page, collectionName, 'List orders');
    await selectRequestPaneTab(page, 'Auth');
    await expect(locators.auth.modeSelector()).toContainText(AUTH_MODE_LABELS.INHERIT);
    await expect(locators.auth.inheritedMode()).toHaveText(schemeLabel);
  });

  await test.step('A request using a different scheme keeps its own auth', async () => {
    await openRequest(page, collectionName, 'Admin reports');
    await selectRequestPaneTab(page, 'Auth');
    await expect(locators.auth.modeSelector()).toContainText(AUTH_MODE_LABELS.BASIC);
  });

  await test.step('An operation with an empty security list gets no auth', async () => {
    await openRequest(page, collectionName, 'Health check');
    await selectRequestPaneTab(page, 'Auth');
    await expect(locators.auth.modeSelector()).toContainText(AUTH_MODE_LABELS.NONE);
  });
};

test.describe('Import OpenAPI with authentication set at collection level', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('puts the security scheme on the collection and lets matching requests inherit it', async ({ page, createTmpDir }) => {
    const importDir = await createTmpDir('openapi-collection-auth');
    const specFile = fixture('openapi-collection-auth-placement.yaml');
    const collectionName = 'Collection Auth API';

    await importCollection(page, specFile, importDir, {
      expectedCollectionName: collectionName,
      authPlacement: 'collection',
      checkForSpecUpdates: true
    });

    await expectAuthAtCollectionLevel(page, collectionName, AUTH_MODE_LABELS.BEARER);

    await test.step('The choice is saved in the sync config', async () => {
      const collectionDir = path.join(importDir, collectionName);
      expectSyncedWithSpec(collectionDir, readOpenApiSyncConfig(collectionDir), specFile, { authPlacement: 'collection' });
    });
  });

  test('does the same for a Swagger 2.0 spec', async ({ page, createTmpDir }) => {
    const importDir = await createTmpDir('swagger2-collection-auth');
    const collectionName = 'Swagger Collection Auth API';

    await importCollection(page, fixture('swagger2-collection-auth-placement.yaml'), importDir, {
      expectedCollectionName: collectionName,
      authPlacement: 'collection'
    });

    await expectAuthAtCollectionLevel(page, collectionName, AUTH_MODE_LABELS.APIKEY);
  });
});
