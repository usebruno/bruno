import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, openCollection, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Postman Collection with OAuth2.0 Implicit Grant Type', () => {
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

  test('should import Postman collection with OAuth2.0 Implicit Grant Type successfully', async ({ page, electronApp, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-oauth2-implicit-grant-type.json');
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('imported-collection');

    await electronApp.evaluate(({ dialog }, { importDir }) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [importDir]
      });
    }, { importDir });

    await test.step('Open import collection modal', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      const importModal = locators.import.modal();
      await importModal.waitFor({ state: 'visible' });
      await expect(locators.modal.title('Import Collection')).toBeVisible();
      await locators.import.fileInput().setInputFiles(postmanFile);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 5000 });
      await expect(locators.modal.title('Import Collection')).toBeVisible();
      await expect(locators.import.locationModal().getByText('My Collection')).toBeVisible();
      const locationModal = locators.import.locationModal();
      await locators.import.browseLink(locationModal).click();
      await locators.import.importButton(locationModal).click();
      await locationModal.waitFor({ state: 'hidden' });
    });

    await test.step('Open collection and verify request is displayed', async () => {
      await openCollection(page, 'My Collection');
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
