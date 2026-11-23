import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  expandCollection,
  expandFolder,
  restoreOpenDialog,
  stashOpenDialog
} from '../../../pages';

const REPOSITORY_URL = 'https://github.com/usebruno/github-rest-api-collection';
const COLLECTION_NAME = 'github rest api';

test.describe('GitHub Repository URL Import', () => {
  test.beforeAll(async ({ electronApp }) => {
    await stashOpenDialog(electronApp);
  });

  test.afterAll(async ({ electronApp }) => {
    await restoreOpenDialog(electronApp);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('GitHub repository URL import', async ({ page }) => {
    const githubUrl = 'https://github.com/usebruno/github-rest-api-collection';

    // Test GitHub repository import
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Select the GitHub tab
    await page.getByTestId('github-tab').click();

    // Fill in the URL input
    await page.getByTestId('git-url-input').fill(githubUrl);
    await page.locator('#clone-git-button').click();

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the Clone Git Repository modal is displayed
    const cloneModal = page.getByRole('dialog');
    await expect(cloneModal.locator('.bruno-modal-header-title')).toContainText('Clone Git Repository');

    // Cleanup: close any open modals using Cancel button (avoids form validation)
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('TC-114: Imports a collection by cloning from a Git repository', { tag: '@sanity' }, async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const collectionTempDir = await createTmpDir('git-repository-import');
    const { plusMenu, import: importLocators, cloneGitRepository, sidebar, toast } = buildCommonLocators(page);
    const cloneModal = cloneGitRepository.modal();

    await test.step('Open the plus menu and verify Import collection is shown', async () => {
      await plusMenu.button().click();
      await plusMenu.importCollection().waitFor({ state: 'visible' });
    });

    await test.step('Choose Import collection and verify that Import dialog shows Git-Repository', async () => {
      await plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
      await expect(importLocators.gitRepositoryTab()).toContainText('Git Repository');
    });

    await test.step('Enter the Git repository URL, choose a location, and clone', async () => {
      await importLocators.gitRepositoryTab().click();
      await importLocators.gitUrlInput().fill(REPOSITORY_URL);
      await importLocators.cloneGitButton().click();
      await cloneModal.waitFor({ state: 'visible' });

      await electronApp.evaluate(({ dialog }, dir: string) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
      }, collectionTempDir);
      await cloneGitRepository.browseLink().click();
      await expect(cloneGitRepository.locationInput()).toHaveValue(collectionTempDir);

      await cloneGitRepository.button('Clone').click();
      await expect(toast.byMessage('Repository cloned successfully')).toBeVisible();
      await expect(cloneGitRepository.collectionHeading()).toContainText('Collections');
      await expect(cloneGitRepository.collectionItem(COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Select the collection and open it', async () => {
      await cloneGitRepository.collectionCheckbox(COLLECTION_NAME).check();
      await cloneGitRepository.button('Open').click();
      await cloneModal.waitFor({ state: 'hidden' });
      await expect(sidebar.collection(COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Verify that Imported collection keeps its folder and requests', async () => {
      await expandCollection(page, COLLECTION_NAME);
      await expect(sidebar.itemsIn(COLLECTION_NAME, 'Repository')).toBeVisible();
      await expect(sidebar.itemsIn(COLLECTION_NAME, 'User')).toBeVisible();

      await expandFolder(page, 'User');
      await expect(sidebar.itemsIn(COLLECTION_NAME, 'User Info')).toBeVisible();
      await expect(sidebar.itemsIn(COLLECTION_NAME, 'User Repos')).toBeVisible();
    });
  });
});
