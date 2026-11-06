import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, expandFolder, importCollection, openCollection, openfolder, openRequest, readRequestBody } from '../../utils/page/actions';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import WSDL Collection', () => {
  const testDataDir = path.join(__dirname, 'fixtures');

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-815: imports a valid WSDL XML file as a Bruno collection', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const wsdlFile = path.join(testDataDir, 'wsdl.xml');
    const { plusMenu, import: importLocators, request, sidebar, tabs } = buildCommonLocators(page);
    const collectionName = 'TestWSDLServiceXML';
    const locationModal = importLocators.locationModal();
    const collectionTempDir = await createTmpDir('wsdl-xml-test');

    await test.step('Open the plus menu and choose Import collection', async () => {
      await plusMenu.button().click();
      await plusMenu.importCollection().waitFor({ state: 'visible' });
      await plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
    });

    await test.step('Verify that Import dialog shows File', async () => {
      await expect(importLocators.fileTab()).toContainText('File');
    });

    await test.step('Choose the WSDL XML file', async () => {
      await expect(importLocators.chooseFilesButton()).toBeVisible();
      await importLocators.fileInput().setInputFiles(wsdlFile);
      await locationModal.waitFor({ state: 'visible' });
      await expect(locationModal.getByText('WSDL Collection')).toBeVisible();
    });

    await test.step('Import the collection', async () => {
      await importLocators.locationInput().fill(collectionTempDir);
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
      await sidebar.collection(collectionName).waitFor({ state: 'visible' });
    });

    await test.step('Verify that Imported collection keeps its folder and requests', async () => {
      await openCollection(page, collectionName);
      await expect(sidebar.itemsIn(collectionName, 'UserService')).toBeVisible();
      await expect(sidebar.collectionScope(collectionName).locator('.collection-item-name')).toHaveCount(1);

      await expandFolder(page, 'UserService');
      await expect(sidebar.itemsIn(collectionName, 'GetUser')).toBeVisible();
      await expect(sidebar.itemsIn(collectionName, 'CreateUser')).toBeVisible();

      await sidebar.itemsIn(collectionName, 'GetUser').click();
      await expect(tabs.activeRequestTab()).toContainText('GetUser');
      await expect(request.urlLine()).toContainText('http://example.com/soap/userservice');
    });
  });

  test('Import WSDL JSON file as Bruno collection', async ({ page, createTmpDir }) => {
    const wsdlFile = path.join(testDataDir, 'wsdl-bruno.json');
    const { plusMenu, import: importLocators, request, sidebar, tabs } = buildCommonLocators(page);
    const collectionName = 'TestWSDLServiceJSON';
    const locationModal = importLocators.locationModal();
    const collectionTempDir = await createTmpDir('wsdl-json-test');

    await test.step('Open import collection modal', async () => {
      await plusMenu.button().click();
      await plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
    });

    await test.step('Choose WSDL JSON file', async () => {
      await importLocators.fileInput().setInputFiles(wsdlFile);
      await locationModal.waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('Select the location for the collection and submit to import', async () => {
      await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
      await expect(locationModal.getByText(collectionName)).toBeVisible();
      await importLocators.locationInput().fill(collectionTempDir);
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
    });

    await test.step('Verify that the collection was imported successfully', async () => {
      await expect(sidebar.collection(collectionName)).toBeVisible();
      await openCollection(page, collectionName);
      await expect(sidebar.collectionScope(collectionName).locator('.collection-item-name')).toHaveCount(1);
    });

    await test.step('Verify that folders and requests were imported correctly', async () => {
      await expect(sidebar.itemsIn(collectionName, 'UserService')).toBeVisible();
      await expandFolder(page, 'UserService');
      await expect(sidebar.itemsIn(collectionName, 'GetUser')).toBeVisible();
      await expect(sidebar.itemsIn(collectionName, 'CreateUser')).toBeVisible();
    });

    await test.step('Verify the CreateUser request is imported correctly', async () => {
      await sidebar.itemsIn(collectionName, 'CreateUser').click();
      await expect(tabs.activeRequestTab()).toContainText('CreateUser');
      await expect(request.urlLine()).toContainText('http://example.com/soap/userservice');
    });
  });

  test('Import a multi-file WSDL bundle, resolving schemaLocation references', async ({ page, createTmpDir }) => {
    const wsdlFile = path.join(testDataDir, 'multifile', 'Service.wsdl');
    const { tabs } = buildCommonLocators(page);
    const collectionTempDir = await createTmpDir('wsdl-multifile-test');

    await importCollection(page, wsdlFile, collectionTempDir);

    await test.step('Open the imported Submit request', async () => {
      await openCollection(page, 'MultiFileWSDLService');
      await openfolder(page, 'MultiFileWSDLService', 'PartyService');
      await openRequest(page, 'MultiFileWSDLService', 'Submit');
      await expect(tabs.activeRequestTab()).toContainText('Submit');
    });

    await test.step('Verify the body was built from the imported schema documents', async () => {
      await expect.poll(() => readRequestBody(page)).toBe(
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:msgd="http://example.com/messagedefinition/v4"><soap:Body>'
        + '<msgd:SubmitRequest><party><status>ACTIVE</status></party></msgd:SubmitRequest>'
        + '</soap:Body></soap:Envelope>'
      );
    });
  });
});
