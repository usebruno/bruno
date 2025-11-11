import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, openCollectionAndAcceptSandbox } from '../../utils/page/actions';

test.describe('Import WSDL Collection', () => {
  const testDataDir = path.join(__dirname, 'fixtures');

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import WSDL XML file as Bruno collection', async ({ page, createTmpDir }) => {
    const wsdlFile = path.join(testDataDir, 'wsdl.xml');

    await test.step('Open import collection modal', async () => {
      await page.getByRole('button', { name: 'Import Collection' }).click();

      // Wait for import collection modal to be ready
      const importModal = page.getByRole('dialog');
      await importModal.waitFor({ state: 'visible' });
    });

    await test.step('Choose WSDL XML file', async () => {
      await page.setInputFiles('input[type="file"]', wsdlFile);

      // Wait for the loader to disappear
      await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });
    });

    await test.step('Select the location for the collection and submit to import', async () => {
      // Verify that the location selection modal is displayed to import the collection
      const locationModal = page.getByRole('dialog');
      await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

      // Wait for collection to appear in the location modal
      await expect(locationModal.getByText('TestWSDLServiceXML')).toBeVisible();

      // select a location
      await page.locator('#collection-location').fill(await createTmpDir('wsdl-xml-test'));
      await page.getByRole('button', { name: 'Import', exact: true }).click();
    });

    await test.step('Verify that the collection was imported successfully', async () => {
      // verify the collection was imported successfully
      await expect(page.locator('#sidebar-collection-name').getByText('TestWSDLServiceXML')).toBeVisible();

      // open the collection and accept the sandbox modal
      await openCollectionAndAcceptSandbox(page, 'TestWSDLServiceXML', 'safe');

      // verify that all requests were imported correctly
      await expect(page.locator('#collection-testwsdlservicexml .collection-item-name')).toHaveCount(1);
    });

    await test.step('Verify that folders and requests were imported correctly', async () => {
      await expect(page.locator('#collection-testwsdlservicexml .collection-item-name').getByText('UserService')).toBeVisible();
      // open the user service folder
      await page.locator('#collection-testwsdlservicexml .collection-item-name').getByText('UserService').click();

      await expect(page.locator('#collection-testwsdlservicexml .collection-item-name').getByText('GetUser')).toBeVisible();
      await expect(page.locator('#collection-testwsdlservicexml .collection-item-name').getByText('CreateUser')).toBeVisible();
    });

    await test.step('Verify the GetUser request is imported correctly', async () => {
      await page.locator('#collection-testwsdlservicexml .collection-item-name').getByText('GetUser').click();
      await expect(page.locator('.request-tab.active').getByText('GetUser')).toBeVisible();
      await expect(page.locator('#request-url').getByText('http://example.com/soap/userservice')).toBeVisible();
    });
  });

  test('Import WSDL JSON file as Bruno collection', async ({ page, createTmpDir }) => {
    const wsdlFile = path.join(testDataDir, 'wsdl-bruno.json');

    await test.step('Open import collection modal', async () => {
      await page.getByRole('button', { name: 'Import Collection' }).click();

      // Wait for import collection modal to be ready
      const importModal = page.getByRole('dialog');
      await importModal.waitFor({ state: 'visible' });
    });

    await test.step('Choose WSDL JSON file', async () => {
      await page.setInputFiles('input[type="file"]', wsdlFile);

      // Wait for the loader to disappear
      await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });
    });

    await test.step('Select the location for the collection and submit to import', async () => {
      // Verify that the location selection modal is displayed to import the collection
      const locationModal = page.getByRole('dialog');
      await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

      // Wait for collection to appear in the location modal
      await expect(locationModal.getByText('TestWSDLServiceJSON')).toBeVisible();

      // select a location
      await page.locator('#collection-location').fill(await createTmpDir('wsdl-json-test'));
      await page.getByRole('button', { name: 'Import', exact: true }).click();
    });

    await test.step('Verify that the collection was imported successfully', async () => {
      // verify the collection was imported successfully
      await expect(page.locator('#sidebar-collection-name').getByText('TestWSDLServiceJSON')).toBeVisible();

      // open the collection and accept the sandbox modal
      await openCollectionAndAcceptSandbox(page, 'TestWSDLServiceJSON', 'safe');

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
