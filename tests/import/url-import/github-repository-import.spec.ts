import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections } from '../../utils/page';

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
    const { cloneGit } = importLocators;

    await test.step('Step 01: Go to menu click on the + icon', async () => {
      await locators.plusMenu.button().click();
      await expect(locators.plusMenu.importCollection()).toBeVisible();
    });

    await test.step('Step 02: Click on Import a collection', async () => {
      await locators.plusMenu.importCollection().click();

      await importLocators.modal().waitFor({ state: 'visible' });
      await expect(importLocators.modalTitle()).toContainText('Import Collection');
      await expect(importLocators.fileTab()).toBeVisible();
      await expect(importLocators.gitRepositoryTab()).toBeVisible();
      await expect(importLocators.urlTab()).toBeVisible();
    });

    await test.step('Step 03: Go to git repository section and Enter the URL and select the location to save the repo then click on the import button', async () => {
      await importLocators.gitRepositoryTab().click();
      await importLocators.gitUrlInput().fill(gitUrl);
      await importLocators.cloneGitButton().click();
      await importLocators.loader().waitFor({ state: 'hidden' });

      await expect(cloneGit.modal()).toBeVisible();
      await expect(cloneGit.modal()).toContainText(gitUrl);

      await electronApp.evaluate(({ dialog }, dir) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [dir]
        });
      }, cloneLocation);

      await cloneGit.locationInput().click();
      await expect(cloneGit.locationInput()).toHaveValue(cloneLocation);

      await cloneGit.cloneButton().click();
      await expect(cloneGit.collectionItemTitle(collectionName)).toBeVisible();
    });

    await test.step('Step 04: Select the desired collections and click on open', async () => {
      await cloneGit.collectionCheckbox(collectionName).check();

      await cloneGit.openButton().click();
      await cloneGit.modal().waitFor({ state: 'hidden' });

      await expect(locators.sidebar.collection(collectionName)).toBeVisible();
      await expect(locators.toast.repositoryClonedSuccessfully()).toBeVisible();
    });
  });
});
