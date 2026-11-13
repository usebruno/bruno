import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, openCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Bruno Collection with Examples', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Bruno collection with examples successfully', async ({ page }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-with-examples.json');

    await test.step('Open import collection modal', async () => {
      await page.getByTestId('collections-header-add-menu').click();
      await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();
    });

    await test.step('Wait for import modal and verify title', async () => {
      const importModal = page.getByRole('dialog');
      await importModal.waitFor({ state: 'visible' });
      await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    });

    await test.step('Upload collection file and verify location modal appears', async () => {
      await page.setInputFiles('input[type="file"]', brunoFile);

      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      const errorMessage = page.getByText('Failed to parse the file');

      const result = await Promise.race([
        locationModal.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'success'),
        errorMessage.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'error')
      ]).catch(() => 'timeout');

      if (result === 'error') {
        throw new Error('Collection import failed with parsing error');
      }
      if (result === 'timeout') {
        throw new Error('Import timed out - neither success nor error state was reached');
      }

      await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    });

    await test.step('Verify collection name appears in location modal', async () => {
      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      await expect(locationModal.getByText('bruno-with-examples')).toBeVisible();
      await page.getByTestId('modal-close-button').click();
    });
  });

  test('TC-105: Imports a valid Bruno collection', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const brunoFile = path.join(__dirname, 'fixtures', 'bruno-with-examples.json');
    const { plusMenu, import: importLocators, request, sidebar, tabs } = buildCommonLocators(page);
    const collectionName = 'bruno-with-examples';
    const requestName = 'echo-request';
    const locationModal = importLocators.locationModal();
    const collectionTempDir = await createTmpDir('bruno-with-examples');

    await test.step('Open the plus menu and choose import collection', async () => {
      await plusMenu.button().click();
      await plusMenu.importCollection().waitFor({ state: 'visible' });
      await plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
    });

    await test.step('Verify that import dialog shows File', async () => {
      await expect(importLocators.fileTab()).toContainText('File');
    });

    await test.step('Choose the Bruno collection file', async () => {
      await expect(importLocators.chooseFilesButton()).toBeVisible();
      await importLocators.fileInput().setInputFiles(brunoFile);
      await locationModal.waitFor({ state: 'visible' });
      await expect(locationModal.getByText(collectionName)).toBeVisible();
    });

    await test.step('Import the collection', async () => {
      await importLocators.locationInput().fill(collectionTempDir);
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
      await sidebar.collection(collectionName).waitFor({ state: 'visible' });
    });

    await test.step('Verify that the imported collection keeps its request', async () => {
      await openCollection(page, collectionName);
      await expect(sidebar.itemsIn(collectionName, requestName)).toBeVisible();
      await expect(sidebar.collectionScope(collectionName).locator('.collection-item-name')).toHaveCount(1);

      await sidebar.itemsIn(collectionName, requestName).click();
      await expect(tabs.activeRequestTab()).toContainText(requestName);
      await expect(request.methodDropdown()).toContainText('POST');
      await expect(request.urlLine()).toContainText('https://testbench-sanity.usebruno.com/api/echo/json');
    });
  });
});
