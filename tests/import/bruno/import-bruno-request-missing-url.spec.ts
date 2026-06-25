import { test, expect } from '../../../playwright';
import * as path from 'path';
import { importCollection, closeAllCollections, buildCommonLocators } from '../../utils/page';

test.describe.serial('Import Bruno Collection - request with missing URL', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  const cases = [
    { fixture: 'bruno-http-request-missing-url.json', collectionName: 'HTTP Collection', type: 'HTTP' },
    { fixture: 'bruno-grpc-request-missing-url.json', collectionName: 'GRPC Collection', type: 'gRPC' }
  ];

  for (const { fixture, collectionName, type } of cases) {
    test(`imports a ${type} request without a URL`, async ({ page, createTmpDir }) => {
      const brunoFile = path.resolve(__dirname, 'fixtures', fixture);
      const location = await createTmpDir(collectionName);

      await importCollection(page, brunoFile, location, {
        expectedCollectionName: collectionName
      });
    });

    test(`${type} collection appears in the sidebar after import`, async ({ page }) => {
      const locators = buildCommonLocators(page);
      await expect(locators.sidebar.collection(collectionName)).toBeVisible();
    });
  }
});
