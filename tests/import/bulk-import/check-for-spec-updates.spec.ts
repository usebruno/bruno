import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, openBulkImportModal } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { expectSyncedWithSpec, readBrunoJsonSyncConfig, readOpenApiSyncConfig } from '../../utils/openapi-sync';

test.describe('Bulk Import check for spec updates', () => {
  const testDataDir = path.join(__dirname, '../test-data');
  const sampleSpecFile = path.join(testDataDir, 'sample-openapi.yaml');
  const ordersSpecFile = path.join(testDataDir, 'sample-openapi-orders.yaml');
  const swagger2SpecFile = path.join(testDataDir, 'sample-swagger2.json');
  const postmanFile = path.join(testDataDir, 'sample-postman.json');
  const syncedSpecFiles = { 'Sample API': sampleSpecFile, 'Sample Orders API': ordersSpecFile };

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Syncs each OpenAPI 3.x spec with its own file and imports Swagger 2.0 without sync', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('bulk-import-spec-updates');
    const collectionNames = ['Sample API', 'Sample Orders API', 'Sample Swagger 2 API', 'Sample Postman Collection'];

    await test.step('Open the bulk import modal and verify Check for Spec Updates is off by default', async () => {
      await openBulkImportModal(page, [sampleSpecFile, ordersSpecFile, swagger2SpecFile, postmanFile]);
      await locators.import.bulkOpenApiConfigurationToggle().click();

      await expect(locators.import.bulkSpecUpdatesToggle()).toBeEnabled();
      await expect(locators.import.bulkSpecUpdatesToggle()).not.toBeChecked();
      await expect(locators.import.bulkSwagger2SyncNote()).toBeHidden();
    });

    await test.step('Turn on Check for Spec Updates and verify the Swagger 2.0 note', async () => {
      await locators.import.bulkSpecUpdatesToggle().check();

      await expect(locators.import.bulkSwagger2SyncNote()).toHaveText('Swagger 2.0 specs are imported without sync: sample-swagger2.json');
    });

    await test.step('Import the collections and close the modal', async () => {
      await locators.import.bulkLocationInput().fill(importDir);
      await locators.import.bulkSubmitButton().click();

      for (const name of collectionNames) {
        await expect(locators.sidebar.collection(name)).toBeVisible();
      }

      await locators.import.bulkSubmitButton().click();
      await expect(locators.import.bulkModal()).toBeHidden();
    });

    await test.step('Verify each OpenAPI 3.x collection syncs with its own spec file', async () => {
      for (const [name, specFile] of Object.entries(syncedSpecFiles)) {
        const collectionDir = path.join(importDir, name);
        expectSyncedWithSpec(collectionDir, readOpenApiSyncConfig(collectionDir), specFile);
      }
    });

    await test.step('Verify the Swagger 2.0 and Postman collections have no sync config', async () => {
      expect(readOpenApiSyncConfig(path.join(importDir, 'Sample Swagger 2 API'))).toBeUndefined();
      expect(readOpenApiSyncConfig(path.join(importDir, 'Sample Postman Collection'))).toBeUndefined();
    });
  });

  test('Syncs each OpenAPI 3.x spec with its own file in BRU format', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('bulk-import-spec-updates-bru');

    await test.step('Open the bulk import modal, choose BRU format and turn on Check for Spec Updates', async () => {
      await openBulkImportModal(page, [sampleSpecFile, ordersSpecFile]);
      await locators.import.bulkModal().getByRole('button', { name: 'Options' }).click();
      await locators.import.advancedOptionsToggle().click();
      await locators.import.bulkFormatSelect().selectOption('bru');
      await locators.import.bulkOpenApiConfigurationToggle().click();
      await locators.import.bulkSpecUpdatesToggle().check();
    });

    await test.step('Import the collections and close the modal', async () => {
      await locators.import.bulkLocationInput().fill(importDir);
      await locators.import.bulkSubmitButton().click();

      for (const name of Object.keys(syncedSpecFiles)) {
        await expect(locators.sidebar.collection(name)).toBeVisible();
      }

      await locators.import.bulkSubmitButton().click();
      await expect(locators.import.bulkModal()).toBeHidden();
    });

    await test.step('Verify each bruno.json syncs with its own spec file', async () => {
      for (const [name, specFile] of Object.entries(syncedSpecFiles)) {
        const collectionDir = path.join(importDir, name);
        expectSyncedWithSpec(collectionDir, readBrunoJsonSyncConfig(collectionDir), specFile);
      }
    });
  });

  test('Disables Check for Spec Updates when every OpenAPI spec is Swagger 2.0', async ({ page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open the bulk import modal with a Swagger 2.0 spec and a Postman collection', async () => {
      await openBulkImportModal(page, [swagger2SpecFile, postmanFile]);
      await locators.import.bulkOpenApiConfigurationToggle().click();
    });

    await test.step('Verify Check for Spec Updates is disabled and says why', async () => {
      await expect(locators.import.bulkSpecUpdatesToggle()).toBeDisabled();
      await expect(locators.import.bulkSpecUpdatesDescription()).toHaveText('OpenAPI Sync is not supported for Swagger 2.0 specs.');
    });

    await test.step('Close the modal', async () => {
      await locators.modal.closeButton().click();
      await expect(locators.import.bulkModal()).toBeHidden();
    });
  });

  test('Disables and resets the OpenAPI configuration while no OpenAPI spec is selected', async ({ page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open the bulk import modal, choose Paths and turn on Check for Spec Updates', async () => {
      await openBulkImportModal(page, [sampleSpecFile, swagger2SpecFile, postmanFile]);
      await locators.import.bulkOpenApiConfigurationToggle().click();
      await locators.import.bulkGroupingDropdown().click();
      await locators.import.bulkGroupingOption('path').click();
      await locators.import.bulkSpecUpdatesToggle().check();
    });

    await test.step('Deselecting every file disables the settings and puts them back to their defaults', async () => {
      await locators.import.bulkSelectAllCollectionsToggle().click();

      await expect(locators.import.bulkGroupingDropdown()).toBeDisabled();
      await expect(locators.import.bulkGroupingDropdown()).toHaveText('Tags');
      await expect(locators.import.bulkSpecUpdatesToggle()).toBeDisabled();
      await expect(locators.import.bulkSpecUpdatesToggle()).not.toBeChecked();
      await expect(locators.import.bulkSpecUpdatesDescription()).toHaveText('Stay notified of spec changes and sync your collection with the spec.');
    });

    await test.step('Selecting only the Postman collection keeps them disabled', async () => {
      await locators.import.bulkCollectionCheckbox('sample-postman.json').check();

      await expect(locators.import.bulkOpenApiConfigurationToggle()).toBeVisible();
      await expect(locators.import.bulkGroupingDropdown()).toBeDisabled();
      await expect(locators.import.bulkSpecUpdatesToggle()).toBeDisabled();
    });

    await test.step('Selecting the Swagger 2.0 spec shows it disabled with the reason', async () => {
      await locators.import.bulkCollectionCheckbox('sample-swagger2.json').check();

      await expect(locators.import.bulkSpecUpdatesToggle()).toBeDisabled();
      await expect(locators.import.bulkSpecUpdatesDescription()).toHaveText('OpenAPI Sync is not supported for Swagger 2.0 specs.');
    });

    await test.step('Selecting the OpenAPI 3.x spec enables it, still unticked', async () => {
      await locators.import.bulkCollectionCheckbox('sample-openapi.yaml').check();

      await expect(locators.import.bulkSpecUpdatesToggle()).toBeEnabled();
      await expect(locators.import.bulkSpecUpdatesToggle()).not.toBeChecked();
      await expect(locators.import.bulkGroupingDropdown()).toBeEnabled();
      await expect(locators.import.bulkGroupingDropdown()).toHaveText('Tags');
    });

    await test.step('Close the modal', async () => {
      await locators.modal.closeButton().click();
      await expect(locators.import.bulkModal()).toBeHidden();
    });
  });
});
