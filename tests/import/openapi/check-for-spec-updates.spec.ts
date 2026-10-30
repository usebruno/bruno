import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';
import { expectSyncedWithSpec, readOpenApiSyncConfig } from '../../utils/openapi-sync';

test.describe('Import OpenAPI with Check for Spec Updates', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Syncs the imported collection with its own spec file', async ({ page, createTmpDir }) => {
    const specFile = path.join(__dirname, '../test-data/sample-openapi.yaml');
    const importDir = await createTmpDir('import-openapi-spec-updates');

    await importCollection(page, specFile, importDir, { expectedCollectionName: 'Sample API', checkForSpecUpdates: true });

    await test.step('Verify the collection syncs with its spec file', async () => {
      const collectionDir = path.join(importDir, 'Sample API');
      expectSyncedWithSpec(collectionDir, readOpenApiSyncConfig(collectionDir), specFile);
    });
  });
});
