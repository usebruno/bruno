import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, openCollection } from '../../utils/page';

test.describe('Insomnia URL Import', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('TC813: Verify Import collection from Valid Insomnia Export from Direct URL',
    { tag: '@sanity' },
    async ({ page, createTmpDir }) => {
      const insomniaUrl
        = 'https://raw.githubusercontent.com/usebruno/bruno/refs/heads/main/tests/import/insomnia/fixtures/insomnia-v5.yaml';
      const collectionName = 'Test API Collection v5';
      const collectionLocation = await createTmpDir('test-api-collection-v5');
      const locators = buildCommonLocators(page);
      const importLocators = locators.import;

      await test.step('Navigate to the Import functionality in Bruno', async () => {
        await locators.plusMenu.button().click();
        await expect(locators.plusMenu.importCollection()).toBeVisible();
        await locators.plusMenu.importCollection().click();

        await importLocators.modal().waitFor({ state: 'visible' });
        await expect(importLocators.importModal.modalTitle()).toContainText('Import Collection');
        await expect(importLocators.importModal.fileTab()).toBeVisible();
        await expect(importLocators.importModal.gitRepositoryTab()).toBeVisible();
        await expect(importLocators.importModal.urlTab()).toBeVisible();
      });

      await test.step('Select \'Import from URL\' option', async () => {
        await importLocators.importModal.urlTab().click();
        await expect(importLocators.importModal.urlInput()).toBeVisible();
        await expect(importLocators.importModal.importUrlButton()).toBeVisible();
      });

      await test.step('Enter a valid Insomnia export URL', async () => {
        await importLocators.importModal.urlInput().fill(insomniaUrl);
        await expect(importLocators.importModal.urlInput()).toHaveValue(insomniaUrl);
      });

      await test.step('Initiate the import process', async () => {
        await importLocators.importModal.importUrlButton().click();
        await importLocators.importModal.loader().waitFor({ state: 'hidden' });
        await expect(importLocators.locationModal()).toBeVisible();
        await expect(importLocators.locationModal().getByText(collectionName)).toBeVisible();
      });

      await test.step('Verify successful import of the Insomnia export', async () => {
        await importLocators.locationInput().fill(collectionLocation);
        await importLocators.importButton(importLocators.locationModal()).click();
        await importLocators.locationModal().waitFor({ state: 'hidden' });
        await expect(locators.sidebar.collection(collectionName)).toBeVisible();
        await openCollection(page, collectionName);
        await expect(locators.sidebar.folder('API Tests')).toBeVisible();
        await expect(locators.sidebar.folder('Data Management')).toBeVisible();
      });
    });
});
