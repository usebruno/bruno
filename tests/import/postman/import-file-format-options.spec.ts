import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Collection File Format Options toggle', { tag: '@sanity' }, () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-3097: imports with the default OpenCollection (YAML) format', async ({ page, electronApp, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-apikey-header-collection.json');
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('import-default-yml');
    const collectionDir = path.join(importDir, 'My Collection');

    await test.step('Click Import Collection', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await expect(locators.modal.title('Import Collection')).toBeVisible();
    });

    await test.step('Select the Postman collection file', async () => {
      await locators.import.fileInput().setInputFiles(postmanFile);
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
      await electronApp.evaluate(({ dialog }, dir) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
      }, importDir);

      await locators.import.browseLink(locationModal).click();
      await locators.import.importButton(locationModal).click();
      await expect(locationModal).toBeHidden();
    });

    await test.step('Collection is saved as OpenCollection (YAML)', async () => {
      await expect.poll(() => fs.existsSync(path.join(collectionDir, 'opencollection.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionDir, 'bruno.json'))).toBe(false);
    });
  });

  test('TC-3292: File Format dropdown is hidden by default for import collection', async ({ page }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-apikey-header-collection.json');
    const locators = buildCommonLocators(page);

    await test.step('Click + and Import collection', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await expect(locators.modal.title('Import Collection')).toBeVisible();
    });

    await test.step('Select a file to import', async () => {
      await locators.import.fileInput().setInputFiles(postmanFile);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('File Format selector is hidden by default', async () => {
      const locationModal = locators.import.locationModal();
      await expect(locators.import.formatSelect(locationModal)).toHaveCount(0);
      await locationModal.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(locationModal).toBeHidden();
    });
  });

  test('TC-3296: BRU format can be selected while importing collection', async ({ page, electronApp, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-apikey-header-collection.json');
    const locators = buildCommonLocators(page);

    await test.step('Open import collection modal', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await expect(locators.modal.title('Import Collection')).toBeVisible();
    });

    await test.step('Upload Postman collection and reach the location modal', async () => {
      await locators.import.fileInput().setInputFiles(postmanFile);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });
    });

    const locationModal = locators.import.locationModal();

    await test.step('Show Advanced Options with OpenCollection (YAML) selected', async () => {
      await locationModal.getByRole('button', { name: 'Options' }).click();
      await locators.import.advancedOptionsToggle().click();

      const formatSelect = locators.import.formatSelect(locationModal);
      await expect(formatSelect).toBeVisible();
      await expect(formatSelect).toHaveValue('yml');
      await expect(locators.import.preserveScriptsToggle()).toBeVisible();
    });

    await test.step('Select BRU Format (.bru)', async () => {
      const formatSelect = locators.import.formatSelect(locationModal);
      await formatSelect.selectOption('bru');
      await expect(formatSelect).toHaveValue('bru');
      await expect(formatSelect.locator('option')).toHaveText(['OpenCollection (YAML)', 'BRU Format (.bru)']);
    });

    await test.step('Click Import', async () => {
      const importDir = await createTmpDir('import-bru-format');
      const collectionDir = path.join(importDir, 'My Collection');

      await electronApp.evaluate(({ dialog }, dir) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
      }, importDir);

      const sidebarCollections = locators.sidebar.collection('My Collection');
      const collectionsBeforeImport = await sidebarCollections.count();

      await locators.import.browseLink(locationModal).click();
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
