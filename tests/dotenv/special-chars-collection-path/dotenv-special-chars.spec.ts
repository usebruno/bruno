import { test, expect } from '../../../playwright';
import { createCollection, createEnvironment, closeAllCollections } from '../../utils/page';

test.describe('DotEnv file in collection with special characters in path', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should detect .env file in collection with brackets in collection name', async ({ page, createTmpDir }) => {
    const collectionName = 'My API (v2)';
    const tmpDir = await createTmpDir(collectionName);

    await test.step('Create collection with brackets in name', async () => {
      await createCollection(page, collectionName, tmpDir);
    });

    await test.step('Create a collection environment to access env settings', async () => {
      await createEnvironment(page, 'Test Env', 'collection');
    });

    await test.step('Open environment config and create .env file', async () => {
      // Open the environment selector to see the .ENV FILES section
      await page.getByTestId('environment-selector-trigger').click();

      // The .env Files section is collapsed by default — click to expand it
      const dotEnvSection = page.locator('.section-header').filter({ hasText: '.env Files' });
      await dotEnvSection.waitFor({ state: 'visible' });
      await dotEnvSection.click();

      // Now click the + button to create a new .env file
      const addButton = dotEnvSection.locator('.section-actions button');
      await addButton.click();

      // Type the .env file name and press Enter
      const nameInput = page.locator('.environment-name-input');
      await nameInput.press('Enter');

      // Wait for success toast
      await expect(page.getByText('.env file created!')).toBeVisible();
    });

    await test.step('Verify .env file is detected by watcher and shown in UI', async () => {
      const dotEnvBadge = page.locator('.section-header').filter({ hasText: '.env Files' }).locator('.section-badge');
      await expect(dotEnvBadge).toHaveText('1');
    });
  });
});
