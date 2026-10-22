import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import jsyaml from 'js-yaml';
import { closeAllCollections, openBulkImportModal } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const readOpenApiSyncConfig = (collectionDir: string) => {
  const collection = jsyaml.load(fs.readFileSync(path.join(collectionDir, 'opencollection.yml'), 'utf8'), { schema: jsyaml.JSON_SCHEMA }) as any;
  return collection.extensions.bruno.openapi;
};

const readBrunoJsonSyncConfig = (collectionDir: string) => {
  return JSON.parse(fs.readFileSync(path.join(collectionDir, 'bruno.json'), 'utf8')).openapi;
};

const specHashOf = (specFile: string) => {
  return crypto.createHash('md5').update(JSON.stringify(jsyaml.load(fs.readFileSync(specFile, 'utf8')))).digest('hex');
};

const expectSyncedWithSpec = (collectionDir: string, syncConfig: any, specFile: string) => {
  expect(syncConfig).toEqual([{
    sourceUrl: expect.any(String),
    groupBy: 'tags',
    autoCheck: true,
    autoCheckInterval: 5,
    lastSyncDate: expect.any(String),
    specHash: specHashOf(specFile)
  }]);
  expect(path.isAbsolute(syncConfig[0].sourceUrl)).toBe(false);
  expect(path.resolve(collectionDir, syncConfig[0].sourceUrl)).toBe(specFile);
};

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

      await expect(locators.import.bulkSpecUpdatesCheckbox()).toBeEnabled();
      await expect(locators.import.bulkSpecUpdatesCheckbox()).not.toBeChecked();
      await expect(locators.import.bulkSwagger2SyncNote()).toBeHidden();
    });

    await test.step('Turn on Check for Spec Updates and verify the Swagger 2.0 note', async () => {
      await locators.import.bulkSpecUpdatesCheckbox().check();

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
      await locators.import.bulkFormatSelect().selectOption('bru');
      await locators.import.bulkSpecUpdatesCheckbox().check();
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
    });

    await test.step('Verify Check for Spec Updates is disabled and says why', async () => {
      await expect(locators.import.bulkSpecUpdatesCheckbox()).toBeDisabled();
      await expect(locators.import.bulkSpecUpdatesDescription()).toHaveText('OpenAPI Sync is not supported for Swagger 2.0 specs.');
    });

    await test.step('Close the modal', async () => {
      await locators.modal.closeButton().click();
      await expect(locators.import.bulkModal()).toBeHidden();
    });
  });
});
