import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, openCollection, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Postman Collection with API Key in Query Params', () => {
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

  test('should import Postman collection with API Key in Query Params successfully', async ({ page, electronApp, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-apikey-query-collection.json');
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
    });

    await test.step('Wait for import modal and verify title', async () => {
      const importModal = page.getByRole('dialog');
      await importModal.waitFor({ state: 'visible' });
      await expect(locators.modal.title('Import Collection')).toBeVisible();
    });

    await test.step('Upload Postman collection file using hidden file input', async () => {
      await locators.import.fileInput().setInputFiles(postmanFile);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('Verify no parsing errors occurred', async () => {
      const hasError = await locators.import.parsingError().isVisible().catch(() => false);
      if (hasError) {
        throw new Error('Collection import failed with parsing error');
      }
    });

    await test.step('Verify location selection modal appears', async () => {
      await expect(locators.modal.title('Import Collection')).toBeVisible();
    });

    await test.step('Verify collection name appears in location modal', async () => {
      await expect(locators.import.locationModal().getByText('My Collection')).toBeVisible();
    });

    await test.step('Click Browse link to select collection folder', async () => {
      await locators.import.browseLink(locators.import.locationModal()).click();
    });

    await test.step('Complete import by clicking import button', async () => {
      const locationModal = locators.import.locationModal();
      await locators.import.importButton(locationModal).click();
      await locationModal.waitFor({ state: 'hidden' });
    });

    await test.step('Open collection', async () => {
      await openCollection(page, 'My Collection');
    });

    await test.step('Verify collection name appears in sidebar', async () => {
      await expect(locators.sidebar.collection('My Collection')).toBeVisible();
    });

    await test.step('Verify request exists in the collection', async () => {
      await expect(locators.sidebar.request('Query with API Key')).toBeVisible();
    });

    await test.step('Click on the request to view details', async () => {
      await locators.sidebar.request('Query with API Key').click();
    });

    await test.step('Verify request details are displayed', async () => {
      await expect(locators.request.pane()).toBeVisible();
    });

    await test.step('Select Auth tab and verify API key details', async () => {
      await selectRequestPaneTab(page, 'Auth');
    });

    await test.step('Verify API key placement dropdown is set to Query Params', async () => {
      await expect(locators.auth.apiKey.placementSelector()).toBeVisible();
      await expect(locators.auth.apiKey.placementLabel()).toHaveText(/Query Params/);
    });
  });
});
