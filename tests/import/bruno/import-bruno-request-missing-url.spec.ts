import { test, expect } from '../../../playwright';
import * as path from 'path';
import { importCollection, closeAllCollections, buildCommonLocators } from '../../utils/page';

test.describe('Import Bruno Collection - request with missing URL', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  const cases = [
    { fixture: 'bruno-http-request-missing-url.json', collectionName: 'HTTP Collection', type: 'HTTP', requestName: 'http request without url' },
    { fixture: 'bruno-grpc-request-missing-url.json', collectionName: 'GRPC Collection', type: 'gRPC', requestName: 'grpc request without url' },
    { fixture: 'bruno-http-example-request-missing-url.json', collectionName: 'HTTP Example Collection', type: 'HTTP example', requestName: 'http example request without url', exampleName: 'Http request example response' }
  ];

  for (const { fixture, collectionName, type, requestName, exampleName } of cases) {
    test(`imports a ${type} request without a URL`, async ({ page, createTmpDir }) => {
      const brunoFile = path.resolve(__dirname, 'fixtures', fixture);
      const location = await createTmpDir(collectionName);

      await test.step('Import the collection', async () => {
        await importCollection(page, brunoFile, location, {
          expectedCollectionName: collectionName
        });
      });

      await test.step(`Verify the collection, request${exampleName ? ' and example' : ''} appear in the sidebar`, async () => {
        const locators = buildCommonLocators(page);

        await expect(locators.sidebar.collection(collectionName)).toBeVisible();
        await expect(locators.sidebar.itemRow(requestName)).toBeVisible();

        if (exampleName) {
          await locators.sidebar.requestExamplesToggle(requestName).click();
          await expect(locators.sidebar.example(exampleName)).toBeVisible();
        }
      });
    });
  }
});
