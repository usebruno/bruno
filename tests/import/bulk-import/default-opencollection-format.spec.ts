import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs/promises';
import { buildCommonLocators, closeAllCollections } from '../../utils/page';

const collectFilesRecursive = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFilesRecursive(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
};

test.describe('Bulk Import - Default OpenCollection format', () => {
  const testDataDir = path.join(__dirname, '../test-data');
  const fixturesDir = path.join(__dirname, 'fixtures');
  const importFiles = [
    path.join(testDataDir, 'sample-postman.json'),
    path.join(fixturesDir, 'sample-postman1.json'),
    path.join(fixturesDir, 'sample-postman2.json')
  ];
  const collectionNames = [
    'Sample Postman Collection',
    'New Collection',
    'External Modules Collection 2'
  ];

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC3098: Verify default format during Bulk Import', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const importLocators = locators.import;
    const importLocation = await createTmpDir('bulk-import-default-yml');

    await test.step('Go to menu click on the + icon', async () => {
      await locators.plusMenu.button().click();
      await expect(locators.plusMenu.importCollection()).toBeVisible();
    });

    await test.step('Click on Import a collection', async () => {
      await locators.plusMenu.importCollection().click();

      await importLocators.modal().waitFor({ state: 'visible' });
      await expect(importLocators.modalTitle()).toContainText('Import Collection');
      await expect(importLocators.fileTab()).toBeVisible();
      await expect(importLocators.gitRepositoryTab()).toBeVisible();
      await expect(importLocators.urlTab()).toBeVisible();
    });

    await test.step('Click on the choose files on the pop-up', async () => {
      await expect(importLocators.chooseFilesButton()).toBeVisible();
      await expect(importLocators.fileInput()).toBeAttached();
    });

    await test.step('Select multiple collections from the device storage', async () => {
      await importLocators.fileInput().setInputFiles(importFiles);
      await importLocators.loader().waitFor({ state: 'hidden' });

      await expect(importLocators.bulkModal()).toBeVisible();
      await expect(importLocators.bulkCollectionsCount()).toHaveText(String(collectionNames.length));

      for (const collectionName of collectionNames) {
        await expect(importLocators.bulkCollectionItem(collectionName)).toBeVisible();
      }
    });

    await test.step('Click on the import button without changing the File Format', async () => {
      const formatSelect = importLocators.bulkFormatSelect();
      await expect(formatSelect).toHaveValue('yml');

      await importLocators.bulkLocationInput().fill(importLocation);
      await importLocators.bulkSubmitButton().click();

      await expect(importLocators.bulkSubmitButton()).toHaveText('Close');
      await importLocators.bulkSubmitButton().click();
      await importLocators.bulkModal().waitFor({ state: 'hidden' });

      for (const collectionName of collectionNames) {
        await expect(locators.sidebar.collection(collectionName)).toBeVisible();
      }

      const allFiles = await collectFilesRecursive(importLocation);
      const relativePaths = allFiles.map((file) => path.relative(importLocation, file));

      for (const collectionName of collectionNames) {
        expect(relativePaths).toContain(path.join(collectionName, 'opencollection.yml'));
      }

      const requestFiles = relativePaths.filter(
        (filePath) => !filePath.endsWith('opencollection.yml') && !filePath.includes(`${path.sep}environments${path.sep}`)
      );
      expect(requestFiles.length).toBeGreaterThan(0);
      expect(requestFiles.every((filePath) => filePath.endsWith('.yml'))).toBe(true);
      expect(relativePaths.some((filePath) => filePath.endsWith('.bru'))).toBe(false);
    });
  }
  );
});
