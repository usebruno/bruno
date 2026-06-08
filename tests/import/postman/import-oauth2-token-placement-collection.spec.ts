import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, openCollection, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Postman Collection with OAuth2 token placement', () => {
  let originalShowOpenDialog;

  test.beforeAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      originalShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp, page }) => {
    await closeAllCollections(page);
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = originalShowOpenDialog;
    });
  });

  test('token placement drives which field is displayed after import', async ({ page, electronApp, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-oauth2-token-placement-collection.json');
    const locators = buildCommonLocators(page);
    const oauth2 = locators.auth.oauth2;

    const importDir = await createTmpDir('imported-collection');

    await electronApp.evaluate(({ dialog }, { importDir }) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [importDir]
      });
    }, { importDir });

    await test.step('Import collection', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      const importModal = locators.import.modal();
      await importModal.waitFor({ state: 'visible' });
      await locators.import.fileInput().setInputFiles(postmanFile);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 5000 });
      const locationModal = locators.import.locationModal();
      await expect(locationModal.getByText('OAuth2 Token Placement')).toBeVisible();
      await locators.import.browseLink(locationModal).click();
      await locators.import.importButton(locationModal).click();
      await locationModal.waitFor({ state: 'hidden' });
      await openCollection(page, 'OAuth2 Token Placement');
      await expect(locators.sidebar.collection('OAuth2 Token Placement')).toBeVisible();
    });

    await test.step('Header placement shows the Header Prefix field, hides the Query Param Key field', async () => {
      await locators.sidebar.request('OAuth2 Token in Header').click();
      await expect(locators.request.pane()).toBeVisible();
      await selectRequestPaneTab(page, 'Auth');

      await expect(oauth2.tokenHeaderPrefixField()).toBeVisible();
      await expect(oauth2.tokenQueryParamKeyField()).not.toBeVisible({ timeout: 1000 });
    });

    await test.step('URL placement shows the Query Param Key field, hides the Header Prefix field', async () => {
      await locators.sidebar.request('OAuth2 Token in URL').click();
      await expect(locators.request.pane()).toBeVisible();
      await selectRequestPaneTab(page, 'Auth');

      await expect(oauth2.tokenQueryParamKeyField()).toBeVisible();
      await expect(oauth2.tokenHeaderPrefixField()).not.toBeVisible({ timeout: 1000 });
    });
  });
});
