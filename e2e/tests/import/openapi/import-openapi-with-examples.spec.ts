import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  buildCommonLocators,
  closeAllCollections,
  expandFolderIn,
  importCollection,
  toggleRequestExamplesIn
} from '../../../pages';

test.describe('Import OpenAPI Collection with Examples', () => {
  const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-with-examples.yaml');
  const collectionName = 'API with Examples';

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import OpenAPI collection with examples successfully', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);

    // Create a temporary directory for the collection to be imported into
    const importDir = await createTmpDir('imported-openapi-collection');

    await importCollection(page, openApiFile, importDir, { expectedCollectionName: collectionName });

    await test.step('Verify GET /users request exists and has examples', async () => {
      await expect(sidebar.itemsIn(collectionName, 'Get all users')).toBeVisible();

      await toggleRequestExamplesIn(page, collectionName, 'Get all users', true);

      await expect(sidebar.exampleIn(collectionName, 'Success Response')).toBeVisible();
      await expect(sidebar.exampleIn(collectionName, 'Empty Response')).toBeVisible();
      await expect(sidebar.exampleIn(collectionName, 'Validation Error')).toBeVisible();
      await expect(sidebar.exampleIn(collectionName, 'Server Error')).toBeVisible();

      await toggleRequestExamplesIn(page, collectionName, 'Get all users', false);
    });

    await test.step('Verify POST /users request exists and has examples', async () => {
      await expect(sidebar.itemsIn(collectionName, 'Create a new user')).toBeVisible();

      await toggleRequestExamplesIn(page, collectionName, 'Create a new user', true);

      await expect(sidebar.exampleIn(collectionName, 'User Created (Valid User)')).toBeVisible();
      await expect(sidebar.exampleIn(collectionName, 'Validation Error (Invalid User)')).toBeVisible();
    });
  });

  test('should import OpenAPI collection with path-based grouping', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);

    // Create a temporary directory for the collection to be imported into
    const importDir = await createTmpDir('imported-openapi-collection-path');

    await importCollection(page, openApiFile, importDir, { expectedCollectionName: collectionName, groupBy: 'path' });

    await test.step('Verify path-based grouping structure', async () => {
      // With path-based grouping, requests should be organized by their path
      // users should be a folder containing GET and POST requests
      await expect(sidebar.itemsIn(collectionName, 'users')).toBeVisible();

      await expandFolderIn(page, collectionName, 'users');

      await expect(sidebar.folderItemNames(collectionName, 'users')).toContainText(['Get all users', 'Create a new user']);
    });

    await test.step('Verify examples work with path-based grouping', async () => {
      await toggleRequestExamplesIn(page, collectionName, 'Get all users', true);

      await expect(sidebar.exampleIn(collectionName, 'Success Response')).toBeVisible();
    });
  });
});
