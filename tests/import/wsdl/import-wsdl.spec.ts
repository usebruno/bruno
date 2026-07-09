import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, openCollection } from '../../utils/page';

test.describe('Import WSDL Collection', () => {
  const testDataDir = path.join(__dirname, 'fixtures');

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC815: Verify the Import collection with Valid WSDL xml File', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const wsdlFile = path.join(testDataDir, 'wsdl.xml');
    const modalCollectionName = 'WSDL Collection';
    const collectionName = 'TestWSDLServiceXML';
    const collectionLocation = await createTmpDir('wsdl-xml-test');
    const locators = buildCommonLocators(page);
    const importLocators = locators.import;

    await test.step('Go to menu click on the + icon', async () => {
      await locators.plusMenu.button().click();
      await expect(locators.plusMenu.importCollection()).toBeVisible();
    });

    await test.step('Click on Import a collection', async () => {
      await locators.plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
      await expect(importLocators.importModal.modalTitle()).toContainText('Import Collection');
      await expect(importLocators.importModal.fileTab()).toBeVisible();
      await expect(importLocators.importModal.gitRepositoryTab()).toBeVisible();
      await expect(importLocators.importModal.urlTab()).toBeVisible();
    });

    await test.step('Click on the choose files on the pop-up', async () => {
      await expect(importLocators.importModal.chooseFilesButton()).toBeVisible();
    });

    await test.step('Select the WSDL collection from the device storage', async () => {
      await importLocators.fileInput().setInputFiles(wsdlFile);
      await importLocators.locationModal().waitFor({ state: 'visible' });
      await expect(importLocators.locationModal().getByText(modalCollectionName)).toBeVisible();
    });

    await test.step('Click on the import button', async () => {
      await importLocators.locationInput().fill(collectionLocation);
      await importLocators.importButton(importLocators.locationModal()).click();
      // await expect(locators.toast.byMessage('Collection imported successfully')).toBeVisible();
      await expect(locators.sidebar.collection(collectionName)).toBeVisible();
    });
  }
  );

  test('Import WSDL JSON file as Bruno collection', async ({ page, createTmpDir }) => {
    const wsdlFile = path.join(testDataDir, 'wsdl-bruno.json');

    await test.step('Open import collection modal', async () => {
      await page.getByTestId('collections-header-add-menu').click();
      await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

      // Wait for import collection modal to be ready
      const importModal = page.getByRole('dialog');
      await importModal.waitFor({ state: 'visible' });
    });

    await test.step('Choose WSDL JSON file', async () => {
      await page.setInputFiles('input[type="file"]', wsdlFile);

      // Wait for location modal to appear after file processing
      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      await locationModal.waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('Select the location for the collection and submit to import', async () => {
      // Verify that the location selection modal is displayed to import the collection
      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

      // Wait for collection to appear in the location modal
      await expect(locationModal.getByText('TestWSDLServiceJSON')).toBeVisible();

      // select a location
      await page.locator('#collection-location').fill(await createTmpDir('wsdl-json-test'));
      await locationModal.getByRole('button', { name: 'Import' }).click();
      await locationModal.waitFor({ state: 'hidden' });
    });

    await test.step('Verify that the collection was imported successfully', async () => {
      // verify the collection was imported successfully
      await expect(page.locator('#sidebar-collection-name').getByText('TestWSDLServiceJSON')).toBeVisible();

      // open the collection and accept the sandbox modal
      await openCollection(page, 'TestWSDLServiceJSON');

      // verify that all requests were imported correctly
      await expect(page.locator('#collection-testwsdlservicejson .collection-item-name')).toHaveCount(1);
    });

    await test.step('Verify that folders and requests were imported correctly', async () => {
      await expect(page.locator('#collection-testwsdlservicejson .collection-item-name').getByText('UserService')).toBeVisible();
      // open the user service folder
      await page.locator('#collection-testwsdlservicejson .collection-item-name').getByText('UserService').click();

      await expect(page.locator('#collection-testwsdlservicejson .collection-item-name').getByText('GetUser')).toBeVisible();
      await expect(page.locator('#collection-testwsdlservicejson .collection-item-name').getByText('CreateUser')).toBeVisible();
    });

    await test.step('Verify the CreateUser request is imported correctly', async () => {
      await page.locator('#collection-testwsdlservicejson .collection-item-name').getByText('CreateUser').click();
      await expect(page.locator('.request-tab.active').getByText('CreateUser')).toBeVisible();
      await expect(page.locator('#request-url').getByText('http://example.com/soap/userservice')).toBeVisible();
    });
  });
});
