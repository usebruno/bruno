import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Global Environment Variable Update via Script', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should update global environment values via script and verify the changes', async ({
    pageWithUserData: page
  }) => {
    await test.step('Open the collection from sidebar', async () => {
      await page.locator('#sidebar-collection-name').filter({ hasText: 'Global Environment Update' }).click();
    });

    await test.step('Open the test request that has a pre-request script', async () => {
      await page.locator('.collection-name', { hasText: 'Global Environment Update' }).click();
      await page.locator('.collection-item-name', { hasText: 'Test Request' }).click();
    });

    await test.step('Run the request', async () => {
      await page.getByTestId('send-arrow-icon').click();
    });

    await test.step('Open the Global Environment Config tab', async () => {
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-global').click();
      await page.getByText('Configure', { exact: true }).click();

      const envTab = page.locator('.request-tab').filter({ hasText: 'Global Environments' });
      await expect(envTab).toBeVisible();
    });

    await test.step('Verify that the value of "existingEnvEnabled" is updated by the pre-request script', async () => {
      const row = page.locator('tbody tr').filter({ has: page.locator('input[value="existingEnvEnabled"]') });
      const value = await row.locator('.CodeMirror-line').first().textContent();
      await expect(value).toContain('newExistingEnvEnabledValue');
    });

    await test.step('Verify that the value of "existingEnvDisabled" is updated by the pre-request script', async () => {
      const row = page.locator('tbody tr').filter({ has: page.locator('input[value="existingEnvDisabled"]') });
      const value = await row.locator('.CodeMirror-line').first().textContent();
      await expect(value).toContain('newExistingEnvDisabledValue');
    });

    await test.step('Verify that a new env variable "newEnv" is added by the pre-request script to the global environment', async () => {
      const row = page.locator('tbody tr').filter({ has: page.locator('input[value="newEnv"]') });
      const value = await row.locator('.CodeMirror-line').first().textContent();
      await expect(value).toContain('newEnvValue');
    });

    await test.step('Verify that the value of "baseUrl" is unchanged.', async () => {
      const row = page.locator('tbody tr').filter({ has: page.locator('input[value="baseUrl"]') });
      const value = await row.locator('.CodeMirror-line').first().textContent();
      await expect(value).toContain('https://echo.usebruno.com');
    });

    await test.step('Close the global environment config tab.', async () => {
      const envTab = page.locator('.request-tab').filter({ hasText: 'Global Environments' });
      await envTab.hover();
      await envTab.getByTestId('request-tab-close-icon').click({ force: true });
    });
  });
});
