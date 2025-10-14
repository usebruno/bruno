import { test, expect } from '../../../playwright';

test.describe.serial('bru.setEnvVar multiple persistent variables', () => {
  test.setTimeout(2 * 10 * 1000);

  test('should persist multiple environment variables from different requests', async ({ pageWithUserData: page }) => {
    await test.step('Select collection', async () => {
      await page.locator('#sidebar-collection-name').click();
    });

    await test.step('Select stage environment', async () => {
      await page.locator('div.current-environment').click();
      await expect(page.locator('.dropdown-item').filter({ hasText: 'Stage' })).toBeVisible();
      await page.locator('.dropdown-item').filter({ hasText: 'Stage' }).click();
      await expect(page.locator('.current-environment').filter({ hasText: /Stage/ })).toBeVisible();
    });

    await test.step('Run the folder containing both requests', async () => {
      // Right-click on the folder to open context menu
      await page.getByText('multiple-persist-vars-folder', { exact: true }).click({ button: 'right' });

      // Click on Run option
      await page.getByText('Run', { exact: true }).click();

      // Click Run button in the modal
      await page.getByRole('button', { name: 'Run', exact: true }).click();

      // Wait for the folder to finish running
      await page.getByRole('button', { name: 'Run Again' }).waitFor({ timeout: 30000 });
    });

    await test.step('Verify both environment variables are set in UI', async () => {
      await page.locator('div.current-environment').click();
      await page.getByText('Configure', { exact: true }).click();
      await expect(page.getByRole('row', { name: 'multiple-persist-vars-key1' }).getByRole('cell').nth(1)).toBeVisible();
      await expect(page.getByRole('row', { name: 'value1' }).getByRole('cell').nth(2)).toBeVisible();
      await expect(page.getByRole('row', { name: 'multiple-persist-vars-key2' }).getByRole('cell').nth(1)).toBeVisible();
      await expect(page.getByRole('row', { name: 'value2' }).getByRole('cell').nth(2)).toBeVisible();
      await page.getByText('×').click();
    });
  });
});
