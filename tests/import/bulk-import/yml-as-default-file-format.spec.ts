import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections, openBulkImportModal } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Bulk Import default file format', () => {
  const testDataDir = path.join(__dirname, '../test-data');
  const filesToImport = [
    path.join(testDataDir, 'sample-postman.json'),
    path.join(testDataDir, 'sample-insomnia.json')
  ];

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('File Format selector defaults to OpenCollection (YAML)', async ({ page }) => {
    await openBulkImportModal(page, filesToImport);
    const locators = buildCommonLocators(page);

    await test.step('File Format defaults to OpenCollection (YAML)', async () => {
      const formatSelect = locators.import.bulkFormatSelect();
      await expect(formatSelect).toBeVisible();
      await expect(formatSelect).toHaveValue('yml');
      await expect(formatSelect.locator('option')).toHaveText(['OpenCollection (YAML)', 'BRU Format (.bru)']);
    });
  });

  test('importing with the default format writes opencollection.yml collections', async ({ page, createTmpDir }) => {
    await openBulkImportModal(page, filesToImport);
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('bulk-import-default-format');

    await test.step('Check the File Format defaults to OpenCollection (YAML)', async () => {
      await expect(locators.import.bulkFormatSelect()).toHaveValue('yml');
    });

    await test.step('Import with the default format and close the modal', async () => {
      await locators.import.bulkLocationInput().fill(importDir);

      await expect(locators.import.bulkSubmitButton()).toHaveText('Import');
      await locators.import.bulkSubmitButton().click();

      await expect(locators.import.bulkSubmitButton()).toHaveText('Close');
      await locators.import.bulkSubmitButton().click();
      await expect(locators.import.bulkModal()).toBeHidden();
    });

    await test.step('Verify each collection is written as opencollection.yml, not bruno.json', async () => {
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
});
