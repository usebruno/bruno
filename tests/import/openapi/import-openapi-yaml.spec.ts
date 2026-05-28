import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('Import OpenAPI v3 YAML Collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import comprehensive OpenAPI v3 YAML successfully', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-comprehensive.yaml');

    await importCollection(page, openApiFile, await createTmpDir('comprehensive-test'), {
      expectedCollectionName: 'Comprehensive API Test Collection'
    });
  });
});
