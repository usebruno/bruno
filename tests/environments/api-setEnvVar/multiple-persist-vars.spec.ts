import { test, expect } from '../../../playwright';
import fs from 'fs';
import path from 'path';

test.describe.serial('bru.setEnvVar multiple persistent variables', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    // Clean up test environment variables after each test
    try {
      // Check if the page is still valid before attempting cleanup
      if (page && !page.isClosed()) {
        await page.locator('#sidebar-collection-name').click();
        await page.getByTestId('environment-selector-trigger').click();
        await page.waitForTimeout(200);
        await page.locator('#configure-env').click();
        await page.waitForTimeout(200);

        // Remove the test environment variables
        const key1Row = page.getByRole('row', { name: 'multiple-persist-vars-key1' });
        if (await key1Row.isVisible()) {
          await key1Row.getByRole('button').click(); // Click the delete button
        }

        const key2Row = page.getByRole('row', { name: 'multiple-persist-vars-key2' });
        if (await key2Row.isVisible()) {
          await key2Row.getByRole('button').click(); // Click the delete button
        }

        await page.getByTestId('modal-close-button').click();
      }
    } catch (error) {
      // Ignore cleanup errors to avoid masking test failures
      console.log('Cleanup failed:', error);
    }
  });

  test('should persist multiple environment variables from different requests', async ({ pageWithUserData: page }) => {
    await test.step('Select collection', async () => {
      await page.locator('#sidebar-collection-name').click();
      // The collection name should be 'collection' based on the test setup
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'collection' })).toBeVisible();
    });

    await test.step('Select stage environment', async () => {
      await page.getByTestId('environment-selector-trigger').click();
      await page.waitForTimeout(200);
      await expect(page.locator('.environment-list .dropdown-item', { hasText: 'Stage' })).toBeVisible();
      await page.locator('.environment-list .dropdown-item', { hasText: 'Stage' }).click();
      await expect(page.locator('.current-environment', { hasText: 'Stage' })).toBeVisible();
    });

    await test.step('Run the folder containing both requests', async () => {
      // Ensure we're in the correct collection context before selecting the folder
      await expect(page.locator('#sidebar-collection-name', { hasText: 'collection' })).toBeVisible();

      // Hover on the folder and open context menu
      await page.getByText('multiple-persist-vars-folder', { exact: true }).hover();
      await page.locator('.collection-item-name').filter({ hasText: 'multiple-persist-vars-folder' }).locator('.menu-icon').click();

      // Click on Run option
      await page.getByText('Run', { exact: true }).click();

      // Click Run button in the modal
      await page.getByRole('button', { name: 'Run', exact: true }).click();

      // Wait for the folder to finish running
      await page.getByRole('button', { name: 'Run Again' }).waitFor({ timeout: 30000 });
    });

    await test.step('Verify both environment variables are set in UI', async () => {
      // Ensure we're still in the correct collection context
      await expect(page.locator('#sidebar-collection-name', { hasText: 'collection' })).toBeVisible();

      await page.getByTestId('environment-selector-trigger').click();
      await page.waitForTimeout(200);
      await page.locator('#configure-env').click();
      await page.waitForTimeout(200);
      await expect(page.getByRole('row', { name: 'multiple-persist-vars-key1' }).getByRole('cell').nth(1)).toBeVisible();
      await expect(page.getByRole('row', { name: 'value1' }).getByRole('cell').nth(2)).toBeVisible();
      await expect(page.getByRole('row', { name: 'multiple-persist-vars-key2' }).getByRole('cell').nth(1)).toBeVisible();
      await expect(page.getByRole('row', { name: 'value2' }).getByRole('cell').nth(2)).toBeVisible();
      await page.getByTestId('modal-close-button').click();
    });

    await test.step('Verify variables are persisted to file', async () => {
      // Check that the variables are written to the Stage.bru file
      const stageBruPath = path.join(__dirname, 'fixtures/collection/environments/Stage.bru');
      const stageBruContent = fs.readFileSync(stageBruPath, 'utf8');

      // Both variables should be present in the file
      expect(stageBruContent).toContain('multiple-persist-vars-key1');
      expect(stageBruContent).toContain('value1');
      expect(stageBruContent).toContain('multiple-persist-vars-key2');
      expect(stageBruContent).toContain('value2');
    });
  });
});
