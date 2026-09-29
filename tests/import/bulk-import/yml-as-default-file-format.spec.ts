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

  test('Bulk import defaults to OpenCollection (YAML) and writes opencollection.yml collections', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('bulk-import-default-format');

    await test.step('Open the bulk import modal and verify the File Format defaults to OpenCollection (YAML)', async () => {
      await openBulkImportModal(page, filesToImport);

      const formatSelect = locators.import.bulkFormatSelect();
      await expect(formatSelect).toBeVisible();
      await expect(formatSelect).toHaveValue('yml');
      await expect(formatSelect.locator('option')).toHaveText(['OpenCollection (YAML)', 'BRU Format (.bru)']);
    });

    await test.step('Set the location, Click Import, then close the modal', async () => {
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
