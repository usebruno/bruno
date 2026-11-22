import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  closeAllCollections,
  importCollection,
  selectRequestPaneTab,
  buildCommonLocators
} from '../../../pages';

test.describe('Import Postman Collection with OAuth2.0 Implicit Grant Type', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import Postman collection with OAuth2.0 Implicit Grant Type successfully', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-oauth2-implicit-grant-type.json');
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('imported-collection');

    await importCollection(page, postmanFile, importDir, { expectedCollectionName: 'My Collection' });

    await test.step('Verify request is displayed', async () => {
      await expect(locators.sidebar.collection('My Collection')).toBeVisible();
      await expect(locators.sidebar.request('OAuth2 Implicit Grant Type')).toBeVisible();
      await locators.sidebar.request('OAuth2 Implicit Grant Type').click();
      await expect(locators.request.pane()).toBeVisible();
    });

    await test.step('Verify OAuth2.0 Implicit Grant Type is set correctly', async () => {
      await selectRequestPaneTab(page, 'Auth');
      await expect(locators.auth.oauth2.grantTypeDropdown()).toContainText('Implicit');
    });
  });
});
