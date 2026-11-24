import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  buildCommonLocators,
  closeAllCollections,
  expandCollection,
  importCollection
} from '../../../pages';
import { expectSyncedWithSpec, readOpenApiSyncConfig } from '../../../utils';

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
      for (const name of ['Find pet by ID', 'listPets', 'Adds a pet to the store', '/health']) {
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
      for (const name of ['getPetById', 'listPets', 'Adds a pet to the store', '/health']) {
        await expect(locators.sidebar.itemsIn(collectionName, name)).toBeVisible();
      }
    });

    await test.step('The choice is saved in the sync config', async () => {
      const collectionDir = path.join(importDir, collectionName);
      expectSyncedWithSpec(collectionDir, readOpenApiSyncConfig(collectionDir), specFile, { requestNameSource: 'operationId' });
    });
  });

  test('names requests from the path alone, keeping a request for each method on a path', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);

    await importCollection(page, specFile, await createTmpDir('openapi-request-naming-path'), {
      expectedCollectionName: collectionName,
      requestNameSource: 'path'
    });
    await expandCollection(page, collectionName);

    await test.step('Requests are named after their path, and GET and POST /pets are both kept', async () => {
      await expect(locators.sidebar.itemsIn(collectionName, '/pets/{petId}')).toBeVisible();
      await expect(locators.sidebar.itemsIn(collectionName, '/pets')).toHaveCount(2);
      await expect(locators.sidebar.itemsIn(collectionName, '/health')).toBeVisible();
    });
  });
});
