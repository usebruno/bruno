import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, expandCollection, importCollection } from '../../utils/page';
import { expectSyncedWithSpec, readOpenApiSyncConfig } from '../../utils/openapi-sync';

const specFile = path.resolve(__dirname, 'fixtures', 'openapi-request-naming.yaml');
const collectionName = 'Request Naming API';

test.describe('Import OpenAPI with Naming requests', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('names requests from the summary by default', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);

    await importCollection(page, specFile, await createTmpDir('openapi-request-naming-summary'), {
      expectedCollectionName: collectionName
    });
    await expandCollection(page, collectionName);

    await test.step('Requests are named from the summary, falling back where it is missing', async () => {
      for (const name of ['Find pet by ID', 'listPets', 'Adds a pet to the store', 'GET /health']) {
        await expect(locators.sidebar.itemsIn(collectionName, name)).toBeVisible();
      }
    });
  });

  test('names requests from the chosen field and saves the choice for sync', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('openapi-request-naming-operation-id');

    await importCollection(page, specFile, importDir, {
      expectedCollectionName: collectionName,
      requestNameSource: 'operationId',
      checkForSpecUpdates: true
    });
    await expandCollection(page, collectionName);

    await test.step('Requests are named from operationId, falling back where it is missing', async () => {
      for (const name of ['getPetById', 'listPets', 'Adds a pet to the store', 'GET /health']) {
        await expect(locators.sidebar.itemsIn(collectionName, name)).toBeVisible();
      }
    });

    await test.step('The choice is saved in the sync config', async () => {
      const collectionDir = path.join(importDir, collectionName);
      expectSyncedWithSpec(collectionDir, readOpenApiSyncConfig(collectionDir), specFile, { requestNameSource: 'operationId' });
    });
  });
});
