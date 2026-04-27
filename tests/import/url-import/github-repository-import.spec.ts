import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('GitHub Repository URL Import', () => {
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

  test('Clone Git Repository collection selection supports Select all', async ({ page, createTmpDir, electronApp }) => {
    const githubUrl = 'https://github.com/usebruno/github-rest-api-collection';

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.getByTestId('github-tab').click();
    await page.getByTestId('git-url-input').fill(githubUrl);
    await page.locator('#clone-git-button').click();
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    const cloneModal = page.getByRole('dialog');
    await expect(cloneModal.locator('.bruno-modal-header-title')).toContainText('Clone Git Repository');

    const cloneTargetPath = await createTmpDir('clone-git-select-all');
    const mockedCollectionPaths = [
      `${cloneTargetPath}/mock-repo/collection-one`,
      `${cloneTargetPath}/mock-repo/folder/collection-two`,
      `${cloneTargetPath}/mock-repo/collection-three`
    ];

    await electronApp.evaluate(({ ipcMain }, paths) => {
      ipcMain.removeHandler('renderer:clone-git-repository');
      ipcMain.handle('renderer:clone-git-repository', async () => 'Repository cloned successfully');

      ipcMain.removeHandler('renderer:scan-for-bruno-files');
      ipcMain.handle('renderer:scan-for-bruno-files', async () => paths);
    }, mockedCollectionPaths);

    const locationInput = cloneModal.locator('#collection-location');
    await locationInput.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.removeAttribute('readonly');
      input.readOnly = false;
    });
    await locationInput.fill(cloneTargetPath);

    await cloneModal.getByRole('button', { name: 'Clone', exact: true }).click();

    await expect(cloneModal.getByText(/bruno collections found/i)).toBeVisible({ timeout: 120000 });

    const selectAll = cloneModal.getByLabel('Select all');
    const collectionCheckboxes = cloneModal.locator('ul > li label input[type="checkbox"]');

    await expect(selectAll).toBeVisible();
    const checkboxCount = await collectionCheckboxes.count();
    expect(checkboxCount).toBe(3);

    await selectAll.check();
    for (let i = 0; i < checkboxCount; i++) {
      await expect(collectionCheckboxes.nth(i)).toBeChecked();
    }

    await selectAll.uncheck();
    for (let i = 0; i < checkboxCount; i++) {
      await expect(collectionCheckboxes.nth(i)).not.toBeChecked();
    }

    await collectionCheckboxes.first().check();
    const isIndeterminate = await selectAll.evaluate((el) => (el as HTMLInputElement).indeterminate);
    expect(isIndeterminate).toBe(true);

    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});
