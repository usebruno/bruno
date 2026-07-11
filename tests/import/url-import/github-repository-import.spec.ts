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
      await expect(importLocators.importModal.modalTitle()).toContainText('Import Collection');
      await expect(importLocators.importModal.fileTab()).toBeVisible();
      await expect(importLocators.importModal.gitRepositoryTab()).toBeVisible();
      await expect(importLocators.importModal.urlTab()).toBeVisible();
    });

    await test.step('Go to git repository section and Enter the URL and select the location to save the repo then click on the import button', async () => {
      await importLocators.importModal.gitRepositoryTab().click();
      await importLocators.importModal.gitUrlInput().fill(gitUrl);
      await importLocators.importModal.cloneGitButton().click();
      await importLocators.importModal.loader().waitFor({ state: 'hidden' });

      await expect(importLocators.cloneGit.cloneGitModal()).toBeVisible();
      await expect(importLocators.cloneGit.cloneGitModal()).toContainText(gitUrl);

      await mockBrowseFiles(electronApp, [cloneLocation]);

      await importLocators.cloneGit.cloneGitLocationInput().click();
      await expect(importLocators.cloneGit.cloneGitLocationInput()).toHaveValue(cloneLocation);

      await importLocators.cloneGit.cloneGitSubmitButton().click();
      await expect(importLocators.cloneGit.cloneGitCollectionItemTitle(collectionName)).toBeVisible();
    });

    await test.step('Select the desired collections and click on open', async () => {
      await importLocators.cloneGit.cloneGitCollectionCheckbox(collectionName).check();

      await importLocators.cloneGit.cloneGitSubmitButton().click();
      await importLocators.cloneGit.cloneGitModal().waitFor({ state: 'hidden' });

      await expect(locators.sidebar.collection(collectionName)).toBeVisible();
      await expect(locators.toast.byMessage('Repository cloned successfully')).toBeVisible();
    });
  });
});
