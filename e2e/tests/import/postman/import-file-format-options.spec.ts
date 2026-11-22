import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import { closeAllCollections, buildCommonLocators, mockBrowseFiles } from '../../../pages';
import { buildOpenCollectionModalLocators, showOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

test.describe('Import Collection File Format Options toggle', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-3097: imports with the default OpenCollection (YAML) format', { tag: '@sanity' }, async ({ page, electronApp, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-apikey-header-collection.json');
    const locators = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const importDir = await createTmpDir('import-default-yml');
    const collectionDir = path.join(importDir, 'My Collection');

    await test.step('Open the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await expect(openCollectionModal.pageTitle()).toHaveText('Import');
    });

    await test.step('Select the Postman collection file', async () => {
      await selectImportFiles(page, [postmanFile]);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });
    });

    const locationModal = locators.import.locationModal();

    await test.step('Leave the file format as the default', async () => {
      await expect(locators.import.formatSelect(locationModal)).toHaveCount(0);
    });

    await test.step('Options toggle reveals the File Format selector defaulting to OpenCollection (YAML)', async () => {
      await locationModal.getByRole('button', { name: 'Options' }).click();
      await locators.import.advancedOptionsToggle().click();

      const formatSelect = locators.import.formatSelect(locationModal);
      await expect(formatSelect).toBeVisible();
    });

    await test.step('Click Import', async () => {
      await mockBrowseFiles(electronApp, [importDir]);
      await locators.import.browseLink(locationModal).click();
      await expect(locators.import.locationInput()).toHaveValue(importDir);
      await locators.import.importButton(locationModal).click();
      await expect(locationModal).toBeHidden();
    });

    await test.step('Collection is saved as OpenCollection (YAML)', async () => {
      await expect.poll(() => fs.existsSync(path.join(collectionDir, 'opencollection.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionDir, 'bruno.json'))).toBe(false);
    });
  });

  test('TC-3292: File Format dropdown is hidden by default for import collection', { tag: '@sanity' }, async ({ page }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-apikey-header-collection.json');
    const locators = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Open the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await expect(openCollectionModal.pageTitle()).toHaveText('Import');
    });

    await test.step('Select a file to import', async () => {
      await selectImportFiles(page, [postmanFile]);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('File Format selector is hidden by default', async () => {
      const locationModal = locators.import.locationModal();
      await expect(locators.import.formatSelect(locationModal)).toHaveCount(0);
      await locationModal.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(locationModal).toBeHidden();
    });
  });

  test('TC-3296: BRU format can be selected while importing collection', { tag: '@sanity' }, async ({ page, electronApp, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-apikey-header-collection.json');
    const locators = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Open the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await expect(openCollectionModal.pageTitle()).toHaveText('Import');
    });

    await test.step('Upload Postman collection and reach the location modal', async () => {
      await selectImportFiles(page, [postmanFile]);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });
    });

    const locationModal = locators.import.locationModal();

    await test.step('Show Advanced Options with OpenCollection (YAML) selected', async () => {
      await locationModal.getByRole('button', { name: 'Options' }).click();
      const toggle = locators.import.advancedOptionsToggle();
      await expect(toggle).toHaveText('Show file format');
      await toggle.click();

      const formatSelect = locators.import.formatSelect(locationModal);
      await expect(formatSelect).toBeVisible();
      await expect(formatSelect).toHaveValue('yml');

      await locators.import.advancedSectionToggle().click();
      await expect(locators.import.preserveScriptsToggle()).toBeVisible();
    });

    await test.step('Select BRU Format (.bru)', async () => {
      const formatSelect = locators.import.formatSelect(locationModal);
      await formatSelect.selectOption('bru');
      await expect(formatSelect).toHaveValue('bru');
      await expect(formatSelect.locator('option')).toHaveText(['OpenCollection (YAML)', 'BRU Format (.bru)']);

      await locationModal.getByRole('button', { name: 'Options' }).click();
      const toggle = locators.import.advancedOptionsToggle();
      await expect(toggle).toHaveText('Hide file format');
      await toggle.click();
      await expect(formatSelect).toHaveCount(0);
    });

    await test.step('Click Import', async () => {
      const importDir = await createTmpDir('import-bru-format');
      const collectionDir = path.join(importDir, 'My Collection');

      const sidebarCollections = locators.sidebar.collection('My Collection');
      const collectionsBeforeImport = await sidebarCollections.count();

      await mockBrowseFiles(electronApp, [importDir]);
      await locators.import.browseLink(locationModal).click();
      await expect(locators.import.locationInput()).toHaveValue(importDir);
      await locators.import.importButton(locationModal).click();
      await expect(locationModal).toBeHidden();
      await expect(sidebarCollections).toHaveCount(collectionsBeforeImport + 1);

      await expect.poll(() => {
        if (!fs.existsSync(collectionDir)) {
          return false;
        }
        const files = fs.readdirSync(collectionDir);
        const requestFiles = files.filter((file) => file.endsWith('.bru') && file !== 'collection.bru');
        return files.includes('collection.bru') && requestFiles.length > 0 && !files.some((file) => file.endsWith('.yml'));
      }).toBe(true);
    });
  });
});
