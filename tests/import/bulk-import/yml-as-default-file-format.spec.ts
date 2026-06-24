import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Bulk Import default file format', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  const openBulkImportModal = async (page) => {
    const locators = buildCommonLocators(page);
    const postmanFile = path.join(testDataDir, 'sample-postman.json');
    const insomniaFile = path.join(testDataDir, 'sample-insomnia.json');

    await locators.plusMenu.button().click();
    await locators.plusMenu.importCollection().click();
    await expect(locators.import.modal()).toBeVisible();

    await locators.import.fileInput().setInputFiles([postmanFile, insomniaFile]);

    const bulkModal = locators.import.bulkModal();
    await expect(bulkModal).toBeVisible();
    return locators;
  };

  test('File Format selector defaults to OpenCollection (YAML)', async ({ page }) => {
    const locators = await openBulkImportModal(page);

    const formatSelect = locators.import.bulkFormatSelect();
    await expect(formatSelect).toBeVisible();
    await expect(formatSelect).toHaveValue('yml');
    await expect(formatSelect.locator('option')).toHaveText(['OpenCollection (YAML)', 'BRU Format (.bru)']);
  });

  test('importing with the default format writes opencollection.yml collections', async ({ page, createTmpDir }) => {
    const locators = await openBulkImportModal(page);

    await expect(locators.import.bulkFormatSelect()).toHaveValue('yml');

    const importDir = await createTmpDir('bulk-import-default-format');
    await locators.import.bulkLocationInput().fill(importDir);

    await expect(locators.import.bulkSubmitButton()).toHaveText('Import');
    await locators.import.bulkSubmitButton().click();

    await expect(locators.import.bulkSubmitButton()).toHaveText('Close');
    await locators.import.bulkSubmitButton().click();
    await expect(locators.import.bulkModal()).toBeHidden();

    const collectionDirs = fs
      .readdirSync(importDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(importDir, entry.name));

    expect(collectionDirs.length).toBeGreaterThan(0);

    for (const dir of collectionDirs) {
      const files = fs.readdirSync(dir);
      expect(files).toContain('opencollection.yml');
      expect(files).not.toContain('bruno.json');
    }
  });
});
