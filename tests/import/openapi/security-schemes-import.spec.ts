import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('OpenAPI Security Schemes Import', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import OpenAPI spec with security schemes', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-with-security-schemes.json');

    await importCollection(page, openApiFile, await createTmpDir('openapi-with-security'), {
      expectedCollectionName: 'API with Security Schemes'
    });
  });

  test('Import OpenAPI spec without security schemes', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-without-security-schemes.json');

    await importCollection(page, openApiFile, await createTmpDir('openapi-without-security'), {
      expectedCollectionName: 'API without Security Schemes'
    });
  });
});
