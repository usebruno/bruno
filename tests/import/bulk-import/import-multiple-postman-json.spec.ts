import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections } from '../../utils/page';

test.describe('Bulk Import - Multiple Postman JSON', () => {
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

  test('TC109: Verify the Import multiple postman collection from file as (.Json) file', { tag: '@sanity' },
    async ({ page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      const importLocators = locators.import;
      const importLocation = await createTmpDir('multiple-postman-collections');

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

      await test.step('Select multiple collections from the file explorer', async () => {
        await importLocators.fileInput().setInputFiles(importFiles);
        await importLocators.loader().waitFor({ state: 'hidden' });

        await expect(importLocators.bulkModal()).toBeVisible();
        await expect(importLocators.bulkModalTitle()).toBeVisible();
        await expect(importLocators.bulkCollectionsCount()).toHaveText(String(collectionNames.length));

        for (const collectionName of collectionNames) {
          await expect(importLocators.bulkCollectionItem(collectionName)).toBeVisible();
        }
      });

      await test.step('Click on the import button', async () => {
        await importLocators.bulkLocationInput().fill(importLocation);
        await importLocators.bulkSubmitButton().click();
        await expect(locators.toast.success(/collections imported successfully/i)).toBeVisible();
        for (const collectionName of collectionNames) {
          await expect(locators.sidebar.collection(collectionName)).toBeVisible();
        }
        await expect(importLocators.bulkSubmitButton()).toHaveText('Close');
        await importLocators.bulkSubmitButton().click();
        await importLocators.bulkModal().waitFor({ state: 'hidden' });
      });
    }
  );
});
