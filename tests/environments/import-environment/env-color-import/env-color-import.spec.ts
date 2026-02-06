import { test, expect } from '../../../../playwright';
import path from 'path';
import { closeAllCollections } from '../../../utils/page';

test.describe.serial('Environment Color Import Tests', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should import global environment with color preserved', async ({ pageWithUserData: page }) => {
    const envWithColorFile = path.join(__dirname, 'fixtures/env-with-color.json');

    await test.step('Open collection and navigate to global environment import', async () => {
      // Open the collection from sidebar
      const collectionName = page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Color Import Test Collection' });
      await expect(collectionName).toBeVisible();
      await collectionName.click();

      // Open environment selector dropdown
      const envSelector = page.getByTestId('environment-selector-trigger');
      await expect(envSelector).toBeVisible();
      await envSelector.click();

      // Click global tab
      const globalTab = page.getByTestId('env-tab-global');
      await expect(globalTab).toBeVisible();
      await globalTab.click();

      // Verify global tab is active
      await expect(globalTab).toHaveClass(/active/);

      // Click Import button
      await page.getByRole('button', { name: 'Import', exact: true }).click();

      // Verify import modal opens
      const importModal = page.getByTestId('import-global-environment-modal');
      await expect(importModal).toBeVisible();
    });

    await test.step('Import environment with color', async () => {
      // Import environment file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByTestId('import-global-environment').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(envWithColorFile);

      // Wait for the environment tab to appear
      const envTab = page.locator('.request-tab').filter({ hasText: 'Global Environments' });
      await expect(envTab).toBeVisible();
    });

    await test.step('Verify imported environment has the color badge displayed', async () => {
      // The color badge should be visible in the environment details
      const colorBadge = page.locator('div.rounded-full[style*="background-color: rgb(16, 185, 129)"]').first();
      await expect(colorBadge).toBeVisible();
    });
  });
});
