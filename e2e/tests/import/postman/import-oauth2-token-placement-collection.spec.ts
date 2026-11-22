import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  closeAllCollections,
  importCollection,
  selectRequestPaneTab,
  buildCommonLocators
} from '../../../pages';

test.describe('Import Postman Collection with OAuth2 token placement', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('token placement drives which field is displayed after import', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-oauth2-token-placement-collection.json');
    const locators = buildCommonLocators(page);
    const oauth2 = locators.auth.oauth2;

    const importDir = await createTmpDir('imported-collection');

    await test.step('Import collection', async () => {
      await importCollection(page, postmanFile, importDir, { expectedCollectionName: 'OAuth2 Token Placement' });
      await expect(locators.sidebar.collection('OAuth2 Token Placement')).toBeVisible();
    });

    await test.step('Header placement shows the Header Prefix field, hides the Query Param Key field', async () => {
      await locators.sidebar.request('OAuth2 Token in Header').click();
      await expect(locators.request.pane()).toBeVisible();
      await selectRequestPaneTab(page, 'Auth');

      await expect(oauth2.tokenHeaderPrefixField()).toBeVisible();
      await expect(oauth2.tokenHeaderPrefixField().locator('.CodeMirror-line')).toHaveText('Bearer');
      await expect(oauth2.tokenQueryParamKeyField()).toHaveCount(0);
    });

    await test.step('URL placement shows the Query Param Key field, hides the Header Prefix field', async () => {
      await locators.sidebar.request('OAuth2 Token in URL').click();
      await expect(locators.request.pane()).toBeVisible();
      await selectRequestPaneTab(page, 'Auth');

      await expect(oauth2.tokenQueryParamKeyField()).toBeVisible();
      await expect(oauth2.tokenQueryParamKeyField().locator('.CodeMirror-line')).toHaveText('access_token');
      await expect(oauth2.tokenHeaderPrefixField()).toHaveCount(0);
    });
  });
});
