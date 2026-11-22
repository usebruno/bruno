import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  closeAllCollections,
  importCollection,
  selectRequestPaneTab,
  buildCommonLocators
} from '../../../pages';

test.describe('Import Postman Collection with API Key in Query Params', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import Postman collection with API Key in Query Params successfully', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-apikey-query-collection.json');
    const locators = buildCommonLocators(page);

    const importDir = await createTmpDir('imported-collection');

    await importCollection(page, postmanFile, importDir, { expectedCollectionName: 'My Collection' });

    await test.step('Verify request is displayed', async () => {
      await expect(locators.sidebar.collection('My Collection')).toBeVisible();
      await expect(locators.sidebar.request('Query with API Key')).toBeVisible();
      await locators.sidebar.request('Query with API Key').click();
      await expect(locators.request.pane()).toBeVisible();
    });

    await test.step('Verify API key is set to Query Params within Auth section', async () => {
      await selectRequestPaneTab(page, 'Auth');
      await expect(locators.auth.apiKey.placementSelector()).toBeVisible();
      await expect(locators.auth.apiKey.placementLabel()).toHaveText('Query Params');
    });
  });
});
