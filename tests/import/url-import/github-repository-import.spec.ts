import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, mockBrowseFiles } from '../../utils/page';

test.describe('Git repository import', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC114: Verify import collection through Cloning from Git Repository', { tag: '@sanity' }, async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const gitUrl = 'https://github.com/usebruno/github-rest-api-collection';
    const collectionName = 'github rest api';
    const cloneLocation = await createTmpDir('git-clone');
    const locators = buildCommonLocators(page);
    const importLocators = locators.import;

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

    await test.step('Go to git repository section and Enter the URL and select the location to save the repo then click on the import button', async () => {
      await importLocators.gitRepositoryTab().click();
      await importLocators.gitUrlInput().fill(gitUrl);
      await importLocators.cloneGitButton().click();
      await importLocators.loader().waitFor({ state: 'hidden' });

      await expect(importLocators.cloneGitModal()).toBeVisible();
      await expect(importLocators.cloneGitModal()).toContainText(gitUrl);

      await mockBrowseFiles(electronApp, [cloneLocation]);

      await importLocators.cloneGitLocationInput().click();
      await expect(importLocators.cloneGitLocationInput()).toHaveValue(cloneLocation);

      await importLocators.cloneGitSubmitButton().click();
      await expect(importLocators.cloneGitCollectionItemTitle(collectionName)).toBeVisible();
    });

    await test.step('Select the desired collections and click on open', async () => {
      await importLocators.cloneGitCollectionCheckbox(collectionName).check();

      await importLocators.cloneGitSubmitButton().click();
      await importLocators.cloneGitModal().waitFor({ state: 'hidden' });

      await expect(locators.sidebar.collection(collectionName)).toBeVisible();
      await expect(locators.toast.success('Repository cloned successfully')).toBeVisible();
    });
  });
});
