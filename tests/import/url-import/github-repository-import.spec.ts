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
});
